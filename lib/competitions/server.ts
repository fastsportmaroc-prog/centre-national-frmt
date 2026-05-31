import "server-only";

import { getSupabaseServerDataClient } from "@/lib/supabase/data-client.server";
import type {
  Competition,
  CompetitionBillet,
  CompetitionBilletLegInput,
  CompetitionBudgetCategorie,
  CompetitionBudgetLine,
  CompetitionDocument,
  CompetitionBilletFacture,
  CompetitionBilletHubRow,
  CompetitionHistoriqueEntry,
  CompetitionInput,
  CompetitionListItem,
  CompetitionMaterielStockEnriched,
  CompetitionMaterielStockInput,
  CompetitionParticipant,
  CompetitionParticipantEnriched,
  CompetitionParticipantType,
  CompetitionTextile,
} from "@/lib/types/competition";
import {
  evaluatePasseportForCompetition,
  evaluateVisaForCompetition,
} from "@/lib/competitions/passeport-competition";
import {
  resolvePasseportExpiration,
  resolveVisaSources,
} from "@/lib/competitions/participant-passeport";
import type { AdminDocument } from "@/lib/types/admin-document";
import { computeCompetitionStatut, withComputedStatut } from "@/lib/competitions/utils";
import {
  embedVisasRequisInNotes,
  normalizeCompetitionVisas,
  resolveVisasRequis,
  stripVisasMarkerFromNotes,
  VISAS_REQUIS_MIGRATION_HINT,
} from "@/lib/competitions/visas-requis-fallback";
import { mutateOmitMissingColumns } from "@/lib/supabase/mutate-omit-missing-columns";
import {
  competitionParticipantTypeLabel,
  isCompetitionStaffParticipantType,
} from "@/lib/constants/budget-membres";
import { randomUUID } from "crypto";
import { resolveJoueurSexe } from "@/lib/v2/joueur-sexe-display";
import type { DossierPasseport } from "@/lib/types/passeport";

const MIGRATION_HINT =
  "Exécutez lib/db/migrations/competitions.sql dans Supabase SQL Editor.";

export async function logCompetitionHistorique(
  competitionId: string,
  action: string,
  details: string | null,
  utilisateurId?: string | null
) {
  const supabase = await getSupabaseServerDataClient();
  await supabase.from("competition_historique").insert({
    competition_id: competitionId,
    utilisateur_id: utilisateurId ?? null,
    action,
    details,
  });
}

export async function listCompetitions(): Promise<{ data: CompetitionListItem[]; error?: string }> {
  const supabase = await getSupabaseServerDataClient();
  const { data: rows, error } = await supabase
    .from("competitions")
    .select("*")
    .order("date_debut", { ascending: false });
  if (error) return { data: [], error: error.message.includes("competitions") ? MIGRATION_HINT : error.message };

  const { data: parts } = await supabase.from("competition_participants").select("competition_id");
  const counts = new Map<string, number>();
  for (const p of parts ?? []) {
    const id = (p as { competition_id: string }).competition_id;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }

  const list = (rows ?? []).map((r) => {
    const c = withComputedStatut(r as Competition);
    return {
      ...c,
      nb_participants: counts.get(c.id) ?? 0,
      statut_affichage: computeCompetitionStatut(c.date_debut, c.date_fin, c.statut),
    };
  });
  return { data: list };
}

export async function getCompetition(id: string): Promise<{ data: CompetitionListItem | null; error?: string }> {
  const supabase = await getSupabaseServerDataClient();
  const { data, error } = await supabase.from("competitions").select("*").eq("id", id).maybeSingle();
  if (error) return { data: null, error: error.message };
  if (!data) return { data: null };
  const c = withComputedStatut(data as Competition);
  const { count } = await supabase
    .from("competition_participants")
    .select("*", { count: "exact", head: true })
    .eq("competition_id", id);
  return {
    data: {
      ...c,
      nb_participants: count ?? 0,
      statut_affichage: computeCompetitionStatut(c.date_debut, c.date_fin, c.statut),
    },
  };
}

function buildCompetitionWritePayload(
  input: Partial<CompetitionInput>,
  existingNotes?: string | null
): Record<string, unknown> {
  const { visas_requis, notes, ...rest } = input;
  const payload: Record<string, unknown> = {
    ...rest,
    updated_at: new Date().toISOString(),
  };

  let userNotes: string | null | undefined;
  if (notes !== undefined) {
    userNotes = stripVisasMarkerFromNotes(notes);
  } else if (visas_requis !== undefined) {
    userNotes = stripVisasMarkerFromNotes(existingNotes);
  }

  if (visas_requis !== undefined) {
    payload.visas_requis = visas_requis;
    payload.notes = embedVisasRequisInNotes(userNotes ?? existingNotes ?? null, visas_requis);
  } else if (userNotes !== undefined) {
    payload.notes = userNotes;
  }

  return payload;
}

export async function createCompetition(
  input: CompetitionInput,
  userId?: string | null
): Promise<{ data: Competition | null; error?: string; warning?: string }> {
  const supabase = await getSupabaseServerDataClient();
  const payload = buildCompetitionWritePayload(input);
  let saved: Competition | null = null;

  const result = await mutateOmitMissingColumns(payload, async (p) => {
    const { data, error } = await supabase.from("competitions").insert(p).select().single();
    if (!error) saved = data as Competition;
    return { ok: !error, error: error?.message };
  });

  if (!result.ok) return { data: null, error: result.error };
  if (!saved) return { data: null, error: "Création sans retour de données." };

  const item = normalizeCompetitionVisas(saved as Competition);
  await logCompetitionHistorique(item.id, "creation", `Compétition créée : ${item.nom}`, userId);
  await seedDefaultBudgetLines(item.id);

  const warning = result.skippedColumns?.includes("visas_requis")
    ? VISAS_REQUIS_MIGRATION_HINT
    : undefined;
  return { data: item, warning };
}

async function seedDefaultBudgetLines(competitionId: string) {
  const supabase = await getSupabaseServerDataClient();
  const categories: CompetitionBudgetCategorie[] = [
    "billets_avion",
    "hebergement",
    "restauration",
    "textiles",
    "frais_inscription",
    "divers",
  ];
  await supabase.from("competition_budget").insert(
    categories.map((categorie) => ({
      competition_id: competitionId,
      categorie,
      montant_prevu: 0,
      montant_reel: 0,
    }))
  );
}

export async function updateCompetition(
  id: string,
  input: Partial<CompetitionInput>,
  userId?: string | null
): Promise<{ data: Competition | null; error?: string; warning?: string }> {
  const supabase = await getSupabaseServerDataClient();

  let existingNotes: string | null = null;
  if (input.visas_requis !== undefined && input.notes === undefined) {
    const { data: row } = await supabase.from("competitions").select("notes").eq("id", id).maybeSingle();
    existingNotes = (row as { notes?: string | null } | null)?.notes ?? null;
  }

  const payload = buildCompetitionWritePayload(input, existingNotes);
  let saved: Competition | null = null;

  const result = await mutateOmitMissingColumns(payload, async (p) => {
    const { data, error } = await supabase
      .from("competitions")
      .update(p)
      .eq("id", id)
      .select()
      .single();
    if (!error) saved = data as Competition;
    return { ok: !error, error: error?.message };
  });

  if (!result.ok) return { data: null, error: result.error };
  if (!saved) return { data: null, error: "Mise à jour sans retour de données." };

  await logCompetitionHistorique(id, "modification", "Informations compétition mises à jour", userId);

  const warning = result.skippedColumns?.includes("visas_requis")
    ? VISAS_REQUIS_MIGRATION_HINT
    : undefined;
  return { data: normalizeCompetitionVisas(saved as Competition), warning };
}

export async function deleteCompetition(
  id: string,
  userId?: string | null
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await getSupabaseServerDataClient();
  const { error } = await supabase.from("competitions").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  await logCompetitionHistorique(id, "suppression", "Compétition supprimée", userId);
  return { ok: true };
}

export async function listParticipants(
  competitionId: string
): Promise<{ data: CompetitionParticipant[]; error?: string }> {
  const supabase = await getSupabaseServerDataClient();
  const { data, error } = await supabase
    .from("competition_participants")
    .select("*")
    .eq("competition_id", competitionId);
  if (error) return { data: [], error: error.message };
  return { data: (data ?? []) as CompetitionParticipant[] };
}

export async function listParticipantsEnriched(
  competitionId: string,
  dateFin: string
): Promise<{ data: CompetitionParticipantEnriched[]; error?: string }> {
  const { data: parts, error } = await listParticipants(competitionId);
  if (error) return { data: [], error };
  if (parts.length === 0) return { data: [] };

  const supabase = await getSupabaseServerDataClient();
  const { data: compRow } = await supabase
    .from("competitions")
    .select("*")
    .eq("id", competitionId)
    .maybeSingle();
  const visasRequis = compRow
    ? resolveVisasRequis(
        (compRow as { visas_requis?: boolean }).visas_requis,
        (compRow as { notes?: string | null }).notes
      )
    : false;

  const joueurIds = parts.filter((p) => p.participant_type === "joueur").map((p) => p.participant_id);
  const coachIds = parts.filter((p) => p.participant_type === "coach").map((p) => p.participant_id);
  const allOwnerIds = [...joueurIds, ...coachIds];

  const [{ data: joueurs }, { data: coaches }, { data: dossiers }, { data: adminDocsRaw }] =
    await Promise.all([
    joueurIds.length
      ? supabase
          .from("joueurs")
          .select("id, nom, prenom, nationalite, sexe, categorie_age, notes, passeport_expiration")
          .in("id", joueurIds)
      : Promise.resolve({ data: [] }),
    coachIds.length
      ? supabase.from("entraineurs").select("*").in("id", coachIds)
      : Promise.resolve({ data: [] }),
    joueurIds.length
      ? supabase.from("dossiers_passeport").select("*").in("joueur_id", joueurIds)
      : Promise.resolve({ data: [] }),
    allOwnerIds.length
      ? supabase.from("documents_administratifs").select("*")
      : Promise.resolve({ data: [] }),
  ]);

  const adminDocs = ((adminDocsRaw ?? []) as AdminDocument[]).filter(
    (d) =>
      (d.owner_type === "player" && joueurIds.includes(d.owner_id)) ||
      (d.owner_type === "coach" && coachIds.includes(d.owner_id))
  );

  const dossierMap = new Map(
    ((dossiers ?? []) as DossierPasseport[]).map((d) => [d.joueur_id, d])
  );

  return {
    data: parts.map((p) => {
      if (p.participant_type === "joueur") {
        const j = (joueurs ?? []).find((x: { id: string }) => x.id === p.participant_id) as
          | {
              id: string;
              nom: string;
              prenom: string;
              nationalite: string | null;
              sexe?: string | number | null;
              categorie_age?: string | null;
              notes?: string | null;
            }
          | undefined;
        const dossier = dossierMap.get(p.participant_id);
        const jRow = j as { passeport_expiration?: string | null } | undefined;
        const exp = resolvePasseportExpiration(
          "player",
          p.participant_id,
          dossier?.date_expiration ?? jRow?.passeport_expiration,
          adminDocs
        );
        const sexe = resolveJoueurSexe({
          sexe: j?.sexe,
          categorie_age: j?.categorie_age,
          notes: j?.notes,
          nom: j?.nom,
          prenom: j?.prenom,
        });
        return {
          ...p,
          nom: j?.nom?.trim() || "Inconnu",
          prenom: j?.prenom?.trim() || "",
          poste: sexe === "F" ? "Joueuse" : "Joueur",
          fonction: null,
          sexe,
          passeport_expiration: exp,
          passeport_alerte: evaluatePasseportForCompetition(exp, dateFin),
          visa_statut: evaluateVisaForCompetition(
            resolveVisaSources("player", p.participant_id, dossier?.visas, adminDocs),
            dateFin,
            j?.nationalite,
            { visasRequis }
          ),
        };
      }

      if (isCompetitionStaffParticipantType(p.participant_type)) {
        const lib = ((p as { libelle?: string | null }).libelle ?? "").trim();
        const tokens = lib.split(/\s+/).filter(Boolean);
        const nom = tokens.length > 0 ? tokens[tokens.length - 1]! : "—";
        const prenom = tokens.length > 1 ? tokens.slice(0, -1).join(" ") : "";
        return {
          ...p,
          nom,
          prenom,
          poste: competitionParticipantTypeLabel(p.participant_type),
          fonction: lib || null,
          sexe: null,
          passeport_expiration: null,
          passeport_alerte: "inconnu" as const,
          visa_statut: "non_requis" as const,
        };
      }

      const c = (coaches ?? []).find((x: { id: string }) => x.id === p.participant_id) as
        | {
            id: string;
            nom?: string | null;
            prenom?: string | null;
            specialite?: string | null;
            nationalite?: string | null;
            passeport_expiration?: string | null;
          }
        | undefined;
      const exp = resolvePasseportExpiration(
        "coach",
        p.participant_id,
        c?.passeport_expiration,
        adminDocs
      );
      const coachNom = (c?.nom ?? "").trim() || "Inconnu";
      const coachPrenom = (c?.prenom ?? "").trim();
      return {
        ...p,
        nom: coachNom,
        prenom: coachPrenom,
        poste: "Coach",
        fonction: c?.specialite?.trim() || null,
        sexe: null,
        passeport_expiration: exp,
        passeport_alerte: evaluatePasseportForCompetition(exp, dateFin),
        visa_statut: evaluateVisaForCompetition(
          resolveVisaSources("coach", p.participant_id, null, adminDocs),
          dateFin,
          c?.nationalite ?? "Maroc",
          { visasRequis }
        ),
      };
    }),
  };
}

export async function addParticipant(
  competitionId: string,
  participantId: string,
  participantType: CompetitionParticipantType,
  userId?: string | null,
  options?: { libelle?: string | null }
): Promise<{ data: CompetitionParticipant | null; error?: string }> {
  const supabase = await getSupabaseServerDataClient();
  let pid = participantId;
  let libelle: string | null = options?.libelle?.trim() || null;

  if (isCompetitionStaffParticipantType(participantType)) {
    if (!libelle) {
      return { data: null, error: "Nom requis pour ce type de membre." };
    }
    pid = pid?.trim() || randomUUID();
  }

  const { data, error } = await supabase
    .from("competition_participants")
    .insert({
      competition_id: competitionId,
      participant_id: pid,
      participant_type: participantType,
      libelle,
    })
    .select()
    .single();
  if (error) return { data: null, error: error.message };
  await logCompetitionHistorique(
    competitionId,
    "participant_ajoute",
    `${participantType} ${libelle ?? pid}`,
    userId
  );
  return { data: data as CompetitionParticipant };
}

export async function removeParticipant(
  id: string,
  competitionId: string,
  userId?: string | null
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await getSupabaseServerDataClient();
  const { error } = await supabase.from("competition_participants").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  await logCompetitionHistorique(competitionId, "participant_retire", `Participant ${id}`, userId);
  return { ok: true };
}

async function assignedQtyByArticle(
  competitionId: string,
  articleId?: string
): Promise<Map<string, number>> {
  const supabase = await getSupabaseServerDataClient();
  let query = supabase
    .from("competition_textiles")
    .select("article_id, quantite")
    .eq("competition_id", competitionId);
  if (articleId) query = query.eq("article_id", articleId);
  const { data } = await query;
  const map = new Map<string, number>();
  for (const row of data ?? []) {
    const id = String(row.article_id);
    map.set(id, (map.get(id) ?? 0) + Number(row.quantite ?? 0));
  }
  return map;
}

export async function listCompetitionTextileStock(competitionId: string) {
  const supabase = await getSupabaseServerDataClient();
  const { data: rows, error } = await supabase
    .from("competition_materiel_stock")
    .select("*, materiels(nom, quantite_disponible)")
    .eq("competition_id", competitionId)
    .order("created_at");
  if (error) {
    if (error.message.includes("competition_materiel_stock")) {
      return { data: [], error: "Exécutez lib/db/migrations/competition_materiel_stock.sql dans Supabase." };
    }
    return { data: [], error: error.message };
  }

  const assigned = await assignedQtyByArticle(competitionId);
  const enriched: CompetitionMaterielStockEnriched[] = (rows ?? []).map((row) => {
    const materiel = row.materiels as { nom: string; quantite_disponible: number } | null;
    const articleId = String(row.article_id);
    const initiale = Number(row.quantite_initiale ?? 0);
    const attribuee = assigned.get(articleId) ?? 0;
    return {
      id: row.id,
      competition_id: row.competition_id,
      article_id: articleId,
      quantite_initiale: initiale,
      created_at: row.created_at,
      updated_at: row.updated_at,
      article_nom: materiel?.nom ?? articleId,
      quantite_attribuee: attribuee,
      quantite_restante: Math.max(0, initiale - attribuee),
      stock_global_disponible: Number(materiel?.quantite_disponible ?? 0),
    };
  });
  return { data: enriched };
}

export async function upsertCompetitionTextileStock(
  competitionId: string,
  items: CompetitionMaterielStockInput[],
  userId?: string | null
): Promise<{ data: CompetitionMaterielStockEnriched[]; error?: string }> {
  const supabase = await getSupabaseServerDataClient();
  const assigned = await assignedQtyByArticle(competitionId);
  const now = new Date().toISOString();

  for (const item of items) {
    const initiale = Math.max(0, Math.floor(item.quantite_initiale));
    const deja = assigned.get(item.article_id) ?? 0;
    if (initiale < deja) {
      const { data: m } = await supabase.from("materiels").select("nom").eq("id", item.article_id).maybeSingle();
      return {
        data: [],
        error: `Stock initial insuffisant pour « ${m?.nom ?? item.article_id} » : ${deja} déjà attribué(s), minimum ${deja}.`,
      };
    }
  }

  for (const item of items) {
    const initiale = Math.max(0, Math.floor(item.quantite_initiale));
    if (initiale === 0) {
      await supabase
        .from("competition_materiel_stock")
        .delete()
        .eq("competition_id", competitionId)
        .eq("article_id", item.article_id);
      continue;
    }
    const { error } = await supabase.from("competition_materiel_stock").upsert(
      {
        competition_id: competitionId,
        article_id: item.article_id,
        quantite_initiale: initiale,
        updated_at: now,
      },
      { onConflict: "competition_id,article_id" }
    );
    if (error) {
      if (error.message.includes("competition_materiel_stock")) {
        return { data: [], error: "Exécutez lib/db/migrations/competition_materiel_stock.sql dans Supabase." };
      }
      return { data: [], error: error.message };
    }
  }

  await logCompetitionHistorique(
    competitionId,
    "stock_textile_maj",
    `${items.length} article(s) — stock initial mis à jour`,
    userId
  );
  const { data } = await listCompetitionTextileStock(competitionId);
  return { data: data ?? [] };
}

export async function listTextiles(competitionId: string) {
  const supabase = await getSupabaseServerDataClient();
  const { data, error } = await supabase
    .from("competition_textiles")
    .select("*, materiels(nom, quantite_disponible)")
    .eq("competition_id", competitionId);
  if (error) return { data: [], error: error.message };
  return { data: data ?? [] };
}

export async function assignTextile(
  competitionId: string,
  payload: {
    participant_id: string;
    article_id: string;
    taille?: string | null;
    quantite: number;
  },
  userId?: string | null
): Promise<{ data: CompetitionTextile | null; error?: string }> {
  const supabase = await getSupabaseServerDataClient();
  const qty = Math.max(1, Math.floor(payload.quantite));

  const { data: materiel, error: mErr } = await supabase
    .from("materiels")
    .select("id, nom, quantite_disponible, quantite_utilisee")
    .eq("id", payload.article_id)
    .single();
  if (mErr || !materiel) return { data: null, error: "Article introuvable dans le stock" };

  const { data: poolRow } = await supabase
    .from("competition_materiel_stock")
    .select("quantite_initiale")
    .eq("competition_id", competitionId)
    .eq("article_id", payload.article_id)
    .maybeSingle();

  if (poolRow) {
    const assigned = await assignedQtyByArticle(competitionId, payload.article_id);
    const deja = assigned.get(payload.article_id) ?? 0;
    const restant = Number(poolRow.quantite_initiale ?? 0) - deja;
    if (restant < qty) {
      return {
        data: null,
        error: `Stock compétition insuffisant pour « ${materiel.nom} » : ${Math.max(0, restant)} restant(s), ${qty} demandé(s). Augmentez le stock initial dans l'onglet Textiles.`,
      };
    }
  }

  const dispo = Number(materiel.quantite_disponible ?? 0);
  if (dispo < qty) {
    return {
      data: null,
      error: `Stock insuffisant pour « ${materiel.nom} » : ${dispo} disponible(s), ${qty} demandé(s).`,
    };
  }

  const { data, error } = await supabase
    .from("competition_textiles")
    .insert({
      competition_id: competitionId,
      participant_id: payload.participant_id,
      article_id: payload.article_id,
      taille: payload.taille ?? null,
      quantite: qty,
    })
    .select()
    .single();
  if (error) return { data: null, error: error.message };

  const newDispo = dispo - qty;
  const newUtil = Number(materiel.quantite_utilisee ?? 0) + qty;
  await supabase
    .from("materiels")
    .update({
      quantite_disponible: newDispo,
      quantite_utilisee: newUtil,
      updated_at: new Date().toISOString(),
    })
    .eq("id", payload.article_id);

  await supabase.from("mouvements_materiel").insert({
    materiel_id: payload.article_id,
    stage_id: null,
    type_mouvement: "sortie_stock",
    quantite: qty,
    commentaire: `Attribution compétition ${competitionId}`,
  });

  await logCompetitionHistorique(
    competitionId,
    "textile_attribue",
    `${qty} × ${materiel.nom} (taille ${payload.taille ?? "—"})`,
    userId
  );
  return { data: data as CompetitionTextile };
}

export async function removeTextile(
  id: string,
  competitionId: string,
  userId?: string | null
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await getSupabaseServerDataClient();
  const { data: row, error: fErr } = await supabase
    .from("competition_textiles")
    .select("*")
    .eq("id", id)
    .single();
  if (fErr || !row) return { ok: false, error: "Attribution introuvable" };

  const { data: materiel } = await supabase
    .from("materiels")
    .select("quantite_disponible, quantite_utilisee")
    .eq("id", row.article_id)
    .single();

  const qty = Number(row.quantite);
  if (materiel) {
    await supabase
      .from("materiels")
      .update({
        quantite_disponible: Number(materiel.quantite_disponible ?? 0) + qty,
        quantite_utilisee: Math.max(0, Number(materiel.quantite_utilisee ?? 0) - qty),
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.article_id);
    await supabase.from("mouvements_materiel").insert({
      materiel_id: row.article_id,
      stage_id: null,
      type_mouvement: "retour",
      quantite: qty,
      commentaire: `Restitution compétition ${competitionId}`,
    });
  }

  const { error } = await supabase.from("competition_textiles").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  await logCompetitionHistorique(competitionId, "textile_retire", `Attribution ${id} supprimée`, userId);
  return { ok: true };
}

export async function listBudget(competitionId: string) {
  const supabase = await getSupabaseServerDataClient();
  const { data, error } = await supabase
    .from("competition_budget")
    .select("*")
    .eq("competition_id", competitionId)
    .order("categorie");
  if (error) return { data: [], error: error.message };
  return { data: (data ?? []) as CompetitionBudgetLine[] };
}

export async function upsertBudgetLine(
  competitionId: string,
  categorie: CompetitionBudgetCategorie,
  montant_prevu: number,
  montant_reel: number,
  notes: string | null,
  userId?: string | null
) {
  const supabase = await getSupabaseServerDataClient();
  const { data, error } = await supabase
    .from("competition_budget")
    .upsert(
      {
        competition_id: competitionId,
        categorie,
        montant_prevu,
        montant_reel,
        notes,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "competition_id,categorie" }
    )
    .select()
    .single();
  if (error) return { data: null, error: error.message };
  await logCompetitionHistorique(competitionId, "budget_modifie", `Poste ${categorie}`, userId);
  return { data: data as CompetitionBudgetLine };
}

export async function listBillets(competitionId: string) {
  const supabase = await getSupabaseServerDataClient();
  const { data, error } = await supabase
    .from("competition_billets")
    .select("*")
    .eq("competition_id", competitionId)
    .order("date_vol");
  if (error) return { data: [], error: error.message };
  return { data: (data ?? []) as CompetitionBillet[] };
}

function billetRow(
  competitionId: string,
  participantId: string,
  type: "aller" | "retour",
  leg: CompetitionBilletLegInput,
  montant?: number | null,
  devise?: string | null
) {
  return {
    competition_id: competitionId,
    participant_id: participantId,
    type,
    date_vol: leg.date_vol,
    heure: leg.heure ?? null,
    numero_vol: leg.numero_vol ?? null,
    compagnie: leg.compagnie ?? null,
    aeroport_depart: leg.aeroport_depart ?? null,
    aeroport_retour: leg.aeroport_retour ?? null,
    aeroport_depart_iata: leg.aeroport_depart_iata ?? null,
    aeroport_retour_iata: leg.aeroport_retour_iata ?? null,
    statut: leg.statut,
    montant: montant ?? leg.montant ?? null,
    devise: devise ?? leg.devise ?? "MAD",
  };
}

async function replaceBilletLeg(
  competitionId: string,
  participantId: string,
  type: "aller" | "retour",
  leg: CompetitionBilletLegInput,
  userId?: string | null,
  montant?: number | null,
  devise?: string | null
) {
  const supabase = await getSupabaseServerDataClient();
  await supabase
    .from("competition_billets")
    .delete()
    .eq("competition_id", competitionId)
    .eq("participant_id", participantId)
    .eq("type", type);

  const row = billetRow(competitionId, participantId, type, leg, montant, devise);
  let { data, error } = await supabase.from("competition_billets").insert(row).select().single();

  if (error?.message?.includes("aeroport_depart") || error?.message?.includes("montant")) {
    const { montant: _m, devise: _dv, aeroport_depart: _d, aeroport_retour: _r, aeroport_depart_iata: _di, aeroport_retour_iata: _ri, ...legacy } =
      row;
    void _m;
    void _dv;
    void _d;
    void _r;
    void _di;
    void _ri;
    const retry = await supabase.from("competition_billets").insert(legacy).select().single();
    data = retry.data;
    error = retry.error;
  }

  if (error) return { data: null, error: error.message };
  await logCompetitionHistorique(
    competitionId,
    "billet_modifie",
    `Vol ${type} — ${leg.statut}`,
    userId
  );
  return { data: data as CompetitionBillet };
}

export async function upsertBillet(
  competitionId: string,
  payload: Omit<CompetitionBillet, "id" | "created_at" | "competition_id"> & { id?: string },
  userId?: string | null
) {
  if (!payload.id) {
    return replaceBilletLeg(
      competitionId,
      payload.participant_id,
      payload.type,
      {
        date_vol: payload.date_vol,
        heure: payload.heure,
        numero_vol: payload.numero_vol,
        compagnie: payload.compagnie,
        aeroport_depart: payload.aeroport_depart,
        aeroport_retour: payload.aeroport_retour,
        aeroport_depart_iata: payload.aeroport_depart_iata,
        aeroport_retour_iata: payload.aeroport_retour_iata,
        statut: payload.statut,
      },
      userId
    );
  }
  const supabase = await getSupabaseServerDataClient();
  const row = { ...payload, competition_id: competitionId };
  const { data, error } = await supabase
    .from("competition_billets")
    .update(row)
    .eq("id", payload.id)
    .select()
    .single();
  if (error) return { data: null, error: error.message };
  await logCompetitionHistorique(
    competitionId,
    "billet_modifie",
    `Vol ${payload.type} — ${payload.statut}`,
    userId
  );
  return { data: data as CompetitionBillet };
}

export async function createBilletsForTeam(
  competitionId: string,
  input: {
    apply_to_all: boolean;
    participant_ids?: string[];
    aller?: CompetitionBilletLegInput;
    retour?: CompetitionBilletLegInput;
    tarif_mode?: "individuel" | "groupe";
    montant_unitaire?: number | null;
    montant_groupe?: number | null;
    devise?: string;
  },
  userId?: string | null
): Promise<{ count: number; error?: string }> {
  const { data: parts } = await listParticipants(competitionId);
  let ids = input.participant_ids?.length ? input.participant_ids : parts.map((p) => p.participant_id);
  if (input.apply_to_all) {
    ids = parts.map((p) => p.participant_id);
  }
  if (ids.length === 0) {
    return { count: 0, error: "Aucun participant dans la compétition" };
  }
  if (!input.aller && !input.retour) {
    return { count: 0, error: "Renseignez au moins un vol aller ou retour" };
  }

  const tarifMode = input.tarif_mode ?? "individuel";
  const devise = input.devise ?? "MAD";
  const legCount = (input.aller ? 1 : 0) + (input.retour ? 1 : 0);
  const billetSlots = ids.length * legCount;
  let montantParBillet: number | null = null;
  if (tarifMode === "individuel" && input.montant_unitaire != null) {
    montantParBillet = Number(input.montant_unitaire);
  } else if (tarifMode === "groupe" && input.montant_groupe != null && billetSlots > 0) {
    montantParBillet = Number(input.montant_groupe) / billetSlots;
  }

  const supabase = await getSupabaseServerDataClient();
  await supabase
    .from("competitions")
    .update({
      billet_tarif_mode: tarifMode,
      montant_billet_groupe: tarifMode === "groupe" ? input.montant_groupe ?? null : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", competitionId);

  let count = 0;
  for (const participantId of ids) {
    if (input.aller) {
      const r = await replaceBilletLeg(
        competitionId,
        participantId,
        "aller",
        input.aller,
        userId,
        montantParBillet,
        devise
      );
      if (r.error) return { count, error: r.error };
      count++;
    }
    if (input.retour) {
      const r = await replaceBilletLeg(
        competitionId,
        participantId,
        "retour",
        input.retour,
        userId,
        montantParBillet,
        devise
      );
      if (r.error) return { count, error: r.error };
      count++;
    }
  }
  await logCompetitionHistorique(
    competitionId,
    "billets_equipe",
    `${count} billet(s) pour ${ids.length} participant(s)`,
    userId
  );
  return { count };
}

export async function deleteBillet(id: string, competitionId: string, userId?: string | null) {
  const supabase = await getSupabaseServerDataClient();
  const { error } = await supabase.from("competition_billets").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  await logCompetitionHistorique(competitionId, "billet_supprime", id, userId);
  return { ok: true };
}

export async function getCompetitionBilletFacture(competitionId: string) {
  const supabase = await getSupabaseServerDataClient();
  const { data, error } = await supabase
    .from("factures_prestataires")
    .select("*")
    .eq("competition_id", competitionId)
    .eq("service_type", "billets_avion")
    .maybeSingle();
  if (error) {
    if (error.message.includes("competition_id") || error.message.includes("billets_avion")) {
      return { data: null, error: "Exécutez lib/db/migrations/competition_billets_montant_factures.sql" };
    }
    return { data: null, error: error.message };
  }
  if (!data) return { data: null };
  return {
    data: {
      id: data.id,
      competition_id: competitionId,
      prestataire_nom: data.prestataire_nom ?? null,
      montant: Number(data.montant ?? 0),
      facture_url: data.facture_url ?? null,
      reference: data.reference ?? null,
      notes: data.notes ?? null,
    } satisfies CompetitionBilletFacture,
  };
}

export async function upsertCompetitionBilletFacture(
  competitionId: string,
  payload: Omit<CompetitionBilletFacture, "competition_id" | "id"> & { id?: string },
  userId?: string | null
) {
  const supabase = await getSupabaseServerDataClient();
  const row = {
    competition_id: competitionId,
    stage_id: null,
    service_type: "billets_avion" as const,
    prestataire_nom: payload.prestataire_nom ?? null,
    montant: payload.montant ?? 0,
    facture_url: payload.facture_url ?? null,
    reference: payload.reference ?? null,
    notes: payload.notes ?? null,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from("factures_prestataires")
    .upsert(row, { onConflict: "competition_id,service_type" })
    .select()
    .single();
  if (error) {
    if (error.message.includes("competition_id") || error.message.includes("billets_avion")) {
      return { data: null, error: "Exécutez lib/db/migrations/competition_billets_montant_factures.sql" };
    }
    return { data: null, error: error.message };
  }

  await upsertBudgetLine(
    competitionId,
    "billets_avion",
    payload.montant ?? 0,
    payload.montant ?? 0,
    payload.reference ? `Facture ${payload.reference}` : "Facture prestataire billets",
    userId
  );
  await logCompetitionHistorique(
    competitionId,
    "facture_billets",
    `Facture ${payload.prestataire_nom ?? "prestataire"} — ${payload.montant} MAD`,
    userId
  );
  return {
    data: {
      id: data.id,
      competition_id: competitionId,
      prestataire_nom: data.prestataire_nom ?? null,
      montant: Number(data.montant ?? 0),
      facture_url: data.facture_url ?? null,
      reference: data.reference ?? null,
      notes: data.notes ?? null,
    } satisfies CompetitionBilletFacture,
  };
}

export async function getCompetitionBilletTarif(competitionId: string) {
  const supabase = await getSupabaseServerDataClient();
  const { data, error } = await supabase
    .from("competitions")
    .select("billet_tarif_mode, montant_billet_groupe")
    .eq("id", competitionId)
    .maybeSingle();
  if (error || !data) {
    return { tarif_mode: "individuel" as const, montant_groupe: null };
  }
  return {
    tarif_mode: (data.billet_tarif_mode as "individuel" | "groupe") ?? "individuel",
    montant_groupe: data.montant_billet_groupe != null ? Number(data.montant_billet_groupe) : null,
  };
}

export async function listCompetitionBilletsHub(): Promise<{
  data: CompetitionBilletHubRow[];
  factures: CompetitionBilletFacture[];
  error?: string;
}> {
  const supabase = await getSupabaseServerDataClient();
  const { data: comps, error: cErr } = await supabase.from("competitions").select("id, nom");
  if (cErr) return { data: [], factures: [], error: cErr.message };

  const { data: billets, error: bErr } = await supabase
    .from("competition_billets")
    .select("*")
    .order("date_vol", { ascending: false });
  if (bErr) return { data: [], factures: [], error: bErr.message };

  const { data: parts } = await supabase.from("competition_participants").select("*");
  const { data: joueurs } = await supabase.from("joueurs").select("id, nom, prenom");
  const { data: coachs } = await supabase.from("entraineurs").select("id, nom, prenom");

  const compMap = new Map((comps ?? []).map((c) => [c.id, c.nom as string]));
  const joueurMap = new Map((joueurs ?? []).map((j) => [j.id, `${j.prenom} ${j.nom}`.trim()]));
  const coachMap = new Map((coachs ?? []).map((c) => [c.id, `${c.prenom} ${c.nom}`.trim()]));
  const partType = new Map(
    (parts ?? []).map((p) => [`${p.competition_id}:${p.participant_id}`, p.participant_type as string])
  );

  const rows: CompetitionBilletHubRow[] = (billets ?? []).map((b) => {
    const pt = partType.get(`${b.competition_id}:${b.participant_id}`) ?? "joueur";
    const name =
      pt === "coach"
        ? coachMap.get(b.participant_id) ?? "Coach"
        : joueurMap.get(b.participant_id) ?? "Joueur";
    return {
      ...(b as CompetitionBillet),
      competition_nom: compMap.get(b.competition_id) ?? "Compétition",
      participant_nom: name,
      participant_type: pt as "joueur" | "coach",
    };
  });

  const { data: facturesRaw } = await supabase
    .from("factures_prestataires")
    .select("*")
    .eq("service_type", "billets_avion")
    .not("competition_id", "is", null);

  const factures: CompetitionBilletFacture[] = (facturesRaw ?? []).map((f) => ({
    id: f.id,
    competition_id: f.competition_id,
    prestataire_nom: f.prestataire_nom ?? null,
    montant: Number(f.montant ?? 0),
    facture_url: f.facture_url ?? null,
    reference: f.reference ?? null,
    notes: f.notes ?? null,
  }));

  return { data: rows, factures };
}

export async function listDocuments(competitionId: string) {
  const supabase = await getSupabaseServerDataClient();
  const { data, error } = await supabase
    .from("competition_documents")
    .select("*")
    .eq("competition_id", competitionId)
    .order("created_at", { ascending: false });
  if (error) return { data: [], error: error.message };
  return { data: (data ?? []) as CompetitionDocument[] };
}

export async function addDocument(
  competitionId: string,
  doc: { nom: string; type: string; url: string; uploaded_by?: string | null },
  userId?: string | null
) {
  const supabase = await getSupabaseServerDataClient();
  const { data, error } = await supabase
    .from("competition_documents")
    .insert({ competition_id: competitionId, ...doc })
    .select()
    .single();
  if (error) return { data: null, error: error.message };
  await logCompetitionHistorique(competitionId, "document_ajoute", doc.nom, userId);
  return { data: data as CompetitionDocument };
}

export async function deleteDocument(id: string, competitionId: string, userId?: string | null) {
  const supabase = await getSupabaseServerDataClient();
  const { error } = await supabase.from("competition_documents").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  await logCompetitionHistorique(competitionId, "document_supprime", id, userId);
  return { ok: true };
}

export async function listHistorique(competitionId: string) {
  const supabase = await getSupabaseServerDataClient();
  const { data, error } = await supabase
    .from("competition_historique")
    .select("*")
    .eq("competition_id", competitionId)
    .order("created_at", { ascending: false });
  if (error) return { data: [], error: error.message };
  return { data: (data ?? []) as CompetitionHistoriqueEntry[] };
}
