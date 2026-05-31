"use server";

import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { getAuthUserFromServer } from "@/lib/auth/server-session";
import { resolveEffectiveAppRole } from "@/lib/auth/passeports-access";
import { generateAndPersistLettre } from "@/lib/letters/save-lettre.server";
import { generateLettreReservation } from "@/lib/letters/generateLettreReservation";
import { buildLicenceReport, formatLicenceRecapText } from "@/lib/letters/licence-report";
import { loadLettrePrintAssets } from "@/lib/letters/load-letter-assets.server";
import type {
  LettreDemandeType,
  LettreHebergementBesoins,
  LettreHebergementException,
  LettreOfficielleRecord,
  LettreReservationInput,
  LettreType,
  StageLettreOverview,
} from "@/lib/letters/letter-types";
import {
  parseParticipantsDatesPayload,
  participantDatesToLettreExceptions,
} from "@/lib/hebergement/participants-dates";
import { deriveLettreHebergementBesoins } from "@/lib/letters/letter-stage-data";
import { getHebergementByStageServer } from "@/lib/data/stage-hebergement.server";
import { getStageParticipantsServer } from "@/lib/data/stage-relations.server";
import { getEntraineurs, getHebergements, getJoueurs, getStages } from "@/lib/supabase/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getStageDetailV2Action } from "@/lib/actions/stage-detail-actions";

function defaultLettreType(
  stage: { hebergement?: boolean | null; terrains?: boolean | null },
  hebergement: unknown | null
): LettreType {
  const hasHeb = !!stage.hebergement || !!hebergement;
  if (!hasHeb && stage.terrains) return "terrains_only";
  return "reservation";
}

function demandeToLettreType(
  demande: LettreDemandeType | undefined,
  stage: { hebergement?: boolean | null; terrains?: boolean | null },
  hebergement: unknown | null
): LettreType {
  if (demande === "sans_hebergement") return "liste_participants";
  if (demande === "avec_hebergement") return "reservation";
  return defaultLettreType(stage, hebergement);
}

async function assertLettreAccess(): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getAuthUserFromServer();
  if (!user) return { ok: false, error: "Connexion requise" };
  const role = resolveEffectiveAppRole(user);
  if (!["admin", "direction", "viewer", "entraineur"].includes(role)) {
    return { ok: false, error: "Accès réservé aux administrateurs" };
  }
  return { ok: true };
}

export async function generateLettreForStageAction(params: {
  stage_id: string;
  club_destinataire?: string;
  type?: LettreType;
  demande_type?: LettreDemandeType;
  exceptions?: LettreHebergementException[];
  contenu_personnalise?: string;
  notes?: string;
  besoins_specifiques?: string;
  hebergement_besoins?: LettreHebergementBesoins;
  nuitees_date_debut?: string;
  nuitees_date_fin?: string;
  nb_courts?: number;
  lieu_envoi?: string;
}) {
  const access = await assertLettreAccess();
  if (!access.ok) return { ok: false as const, error: access.error };

  const stageId = decodeURIComponent(String(params.stage_id ?? "").trim());
  if (!stageId) return { ok: false as const, error: "Stage introuvable" };

  let stage = await getStageDetailV2Action(stageId);
  if (!stage) {
    // Fallback legacy: list globale si accès direct indisponible
    const stages = await getStages();
    stage = stages.find((s) => s.id === stageId) ?? null;
  }
  if (!stage) {
    return {
      ok: false as const,
      error: "Stage inexistant ou inaccessible. Ouvrez le stage puis réessayez.",
    };
  }

  const [{ joueurs, coachs }, hebergement] = await Promise.all([
    getStageParticipantsServer(stage.id),
    getHebergementByStageServer(stage.id),
  ]);

  const lieu = params.lieu_envoi?.trim() || "Rabat";
  const dateLettre = `${lieu}, le ${format(new Date(), "d MMMM yyyy", { locale: fr })}`;
  const club =
    params.club_destinataire?.trim() ||
    stage.lieu?.trim() ||
    "Club de l'Agriculture Rabat";

  const lettreType =
    params.type ??
    demandeToLettreType(params.demande_type, stage, hebergement);

  const hebergementBesoins = deriveLettreHebergementBesoins(
    hebergement,
    joueurs,
    coachs,
    params.hebergement_besoins
  );

  const defaultHebDebut = hebergement?.date_debut ?? stage.date_debut;
  const defaultHebFin = hebergement?.date_fin ?? stage.date_fin;
  const datesPayload = parseParticipantsDatesPayload(hebergement);
  const fromHebergement = datesPayload.actif
    ? participantDatesToLettreExceptions(datesPayload.rows, defaultHebDebut, defaultHebFin)
    : [];
  const manualExceptions = params.exceptions ?? [];
  const mergedExceptions = [...fromHebergement];
  for (const ex of manualExceptions) {
    const idx = mergedExceptions.findIndex(
      (m) => m.personne_id === ex.personne_id && m.personne_type === ex.personne_type
    );
    if (idx >= 0) mergedExceptions[idx] = ex;
    else mergedExceptions.push(ex);
  }

  const result = await generateAndPersistLettre({
    stage_id: stage.id,
    stage,
    joueurs,
    coachs,
    hebergement:
      hebergement ??
      (stage.hebergement && lettreType === "reservation"
        ? {
            id: "",
            stage_id: stage.id,
            date_debut: params.nuitees_date_debut ?? stage.date_debut,
            date_fin: params.nuitees_date_fin ?? stage.date_fin,
            statut: "prevu",
          }
        : null),
    clubDestinataire: club,
    dateLettre,
    type: lettreType,
    exceptions: mergedExceptions,
    contenuPersonnalise: params.contenu_personnalise,
    notes: params.notes,
    besoinsSpecifiques: params.besoins_specifiques,
    hebergementBesoins,
    nuiteesDateDebut: params.nuitees_date_debut ?? hebergement?.date_debut,
    nuiteesDateFin: params.nuitees_date_fin ?? hebergement?.date_fin,
    nbCourts: params.nb_courts ?? 2,
  });

  if (result.ok && result.record) {
    const recap = formatLicenceRecapText(
      buildLicenceReport(joueurs, coachs),
      stage.stage_action
    );
    return {
      ...result,
      licence_recap_text: recap,
      licence_recap_base64: Buffer.from(recap, "utf-8").toString("base64"),
    };
  }
  return result;
}

export async function listLettresByStageAction(stage_id: string): Promise<LettreOfficielleRecord[]> {
  const all = await listLettresAction();
  return all.filter((l) => l.stage_id === stage_id);
}

export async function getStagesLettresOverviewAction(): Promise<StageLettreOverview[]> {
  const [stages, hebergements, lettres] = await Promise.all([
    getStages(),
    getHebergements(),
    listLettresAction(),
  ]);

  const lettreByStage = new Map<string, LettreOfficielleRecord>();
  for (const l of lettres) {
    if (!lettreByStage.has(l.stage_id)) lettreByStage.set(l.stage_id, l);
  }

  const overviews: StageLettreOverview[] = [];
  for (const s of stages) {
    const { joueurs, coachs } = await getStageParticipantsServer(s.id);
    const heb = hebergements.find((h) => h.stage_id === s.id);
    const lettre = lettreByStage.get(s.id);
    overviews.push({
      id: s.id,
      stage_action: s.stage_action,
      date_debut: s.date_debut,
      date_fin: s.date_fin,
      lieu: s.lieu,
      categorie: s.categorie,
      hebergement: !!s.hebergement || !!heb,
      terrains: !!s.terrains,
      nb_joueurs: joueurs.length,
      nb_coachs: coachs.length,
      club_default: s.lieu?.trim() || "Club de l'Agriculture Rabat",
      lettre_id: lettre?.id ?? null,
      lettre_date: lettre?.date_lettre ?? null,
    });
  }

  return overviews.sort(
    (a, b) => new Date(b.date_debut).getTime() - new Date(a.date_debut).getTime()
  );
}

export async function listLettresAction(): Promise<LettreOfficielleRecord[]> {
  const supabase = await createSupabaseServerClient();
  if (supabase) {
    const { data, error } = await supabase
      .from("lettres_officielles")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (!error && data?.length) {
      const stages = await getStages();
      const stageMap = new Map(stages.map((s) => [s.id, s.stage_action]));
      return data.map((row) => ({
        id: row.id as string,
        stage_id: row.stage_id as string,
        stage_nom: stageMap.get(row.stage_id as string) ?? "—",
        club_destinataire: (row.club_destinataire as string) ?? "—",
        date_lettre: String(row.date_lettre ?? "").slice(0, 10),
        type: ((row.type as string) ?? "reservation") as LettreType,
        avec_hebergement: !!row.avec_hebergement,
        avec_terrains: row.avec_terrains !== false,
        participants: (row.participants as LettreOfficielleRecord["participants"]) ?? [],
        exceptions_hebergement:
          (row.exceptions_hebergement as LettreOfficielleRecord["exceptions_hebergement"]) ?? [],
        contenu_personnalise: (row.contenu_personnalise as string) ?? null,
        statut: (row.statut as string) ?? "generee",
        created_at: (row.created_at as string) ?? new Date().toISOString(),
        pdf_base64: null,
        docx_base64: null,
      }));
    }
  }
  return [];
}

export async function regenerateLettreFilesAction(input: LettreReservationInput) {
  const printAssets = loadLettrePrintAssets();
  const result = await generateLettreReservation(input, {
    logoBase64: printAssets.logo?.base64 ?? null,
    logoFormat: printAssets.logo?.format ?? "PNG",
    cachet: printAssets.cachet,
  });
  return {
    pdfBase64: result.pdfBase64,
    docxBase64: result.docxBase64,
    filenameBase: result.filenameBase,
    content: result.content,
  };
}

export async function deleteLettreAction(id: string) {
  const supabase = await createSupabaseServerClient();
  if (supabase) {
    await supabase.from("lettres_officielles").delete().eq("id", id);
  }
  return { ok: true };
}

export async function getStageOptionsForLettreAction() {
  const [stages, joueurs, entraineurs, hebergements] = await Promise.all([
    getStages(),
    getJoueurs(),
    getEntraineurs(),
    getHebergements(),
  ]);
  return { stages, joueurs, entraineurs, hebergements };
}
