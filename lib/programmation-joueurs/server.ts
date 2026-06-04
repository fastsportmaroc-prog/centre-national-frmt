import "server-only";

import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getSupabaseServerDataClient } from "@/lib/supabase/data-client.server";
import type {
  CreateProgrammationPayload,
  ProgrammationEvenement,
  ProgrammationEvenementEnriched,
  ProgrammationEvenementInput,
  ProgrammationFilters,
  ProgrammationJoueurStats,
  ProgrammationStatut,
} from "@/lib/types/programmation-joueurs";
import {
  localCreateProgrammation,
  localDeleteProgrammation,
  localGetProgrammation,
  localListProgrammation,
  localStatsProgrammationJoueur,
  localUpdateProgrammation,
} from "@/lib/local-test/programmation-joueurs-store";
import { differenceInCalendarDays, parseISO } from "date-fns";

const TABLE = "programmation_evenements";

function resolveStatutRow(row: ProgrammationEvenement): ProgrammationEvenement {
  const today = new Date().toISOString().slice(0, 10);
  if (row.statut === "termine") return row;
  if (row.date_fin < today) return { ...row, statut: "termine" };
  if (row.date_debut <= today && row.date_fin >= today) return { ...row, statut: "en_cours" };
  return { ...row, statut: "a_venir" };
}

async function enrichRows(rows: ProgrammationEvenement[]): Promise<ProgrammationEvenementEnriched[]> {
  if (!rows.length) return [];
  if (!isSupabaseConfigured()) {
    return rows.map((r) => ({ ...resolveStatutRow(r) }));
  }
  const supabase = await getSupabaseServerDataClient();
  const ids = [...new Set(rows.map((r) => r.joueur_id))];
  const { data: joueurs } = await supabase
    .from("joueurs")
    .select("id, nom, prenom, photo_url, categorie, classement")
    .in("id", ids);
  const byId = new Map((joueurs ?? []).map((j) => [j.id, j]));
  return rows.map((r) => {
    const j = byId.get(r.joueur_id);
    return {
      ...resolveStatutRow(r),
      joueur_nom: j?.nom,
      joueur_prenom: j?.prenom,
      joueur_photo_url: j?.photo_url,
      joueur_categorie: j?.categorie,
      joueur_classement: j?.classement,
    };
  });
}

export async function listProgrammationEvenements(
  filters?: ProgrammationFilters
): Promise<{ data: ProgrammationEvenementEnriched[]; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { data: await enrichRows(localListProgrammation(filters)) };
  }
  try {
    const supabase = await getSupabaseServerDataClient();
    let q = supabase.from(TABLE).select("*").order("date_debut", { ascending: true });
    if (filters?.joueurId) q = q.eq("joueur_id", filters.joueurId);
    if (filters?.joueurIds?.length) q = q.in("joueur_id", filters.joueurIds);
    if (filters?.type) {
      const types = Array.isArray(filters.type) ? filters.type : [filters.type];
      q = q.in("type", types);
    }
    if (filters?.statut) q = q.eq("statut", filters.statut);
    if (filters?.surface) q = q.eq("surface", filters.surface);
    if (filters?.dateDebut) q = q.gte("date_fin", filters.dateDebut.slice(0, 10));
    if (filters?.dateFin) q = q.lte("date_debut", filters.dateFin.slice(0, 10));
    if (filters?.search?.trim()) {
      const term = `%${filters.search.trim()}%`;
      q = q.or(`nom.ilike.${term},ville.ilike.${term},pays.ilike.${term}`);
    }
    if (filters?.categorieJoueur) {
      const { data: js } = await supabase
        .from("joueurs")
        .select("id")
        .ilike("categorie", `%${filters.categorieJoueur}%`);
      const ids = (js ?? []).map((j) => j.id);
      if (!ids.length) return { data: [] };
      q = q.in("joueur_id", ids);
    }
    const { data, error } = await q;
    if (error) return { data: [], error: error.message };
    return { data: await enrichRows((data ?? []) as ProgrammationEvenement[]) };
  } catch (e) {
    return { data: [], error: e instanceof Error ? e.message : String(e) };
  }
}

export async function getProgrammationEvenement(
  id: string
): Promise<{ data: ProgrammationEvenementEnriched | null; error?: string }> {
  if (!isSupabaseConfigured()) {
    const row = localGetProgrammation(id);
    if (!row) return { data: null };
    return { data: (await enrichRows([row]))[0] ?? null };
  }
  try {
    const supabase = await getSupabaseServerDataClient();
    const { data, error } = await supabase.from(TABLE).select("*").eq("id", id).maybeSingle();
    if (error) return { data: null, error: error.message };
    if (!data) return { data: null };
    return { data: (await enrichRows([data as ProgrammationEvenement]))[0] ?? null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function listProgrammationForJoueur(
  joueurId: string,
  filters?: Omit<ProgrammationFilters, "joueurId">
): Promise<{ data: ProgrammationEvenementEnriched[]; error?: string }> {
  return listProgrammationEvenements({ ...filters, joueurId });
}

function stripMulti(payload: CreateProgrammationPayload): ProgrammationEvenementInput {
  const { joueur_ids: _ids, ...rest } = payload;
  return rest as ProgrammationEvenementInput;
}

export async function createProgrammationEvenements(
  payload: CreateProgrammationPayload,
  userId?: string | null
): Promise<{ data: ProgrammationEvenement[]; error?: string }> {
  const joueurIds =
    payload.joueur_ids?.length ? payload.joueur_ids : payload.joueur_id ? [payload.joueur_id] : [];
  if (!joueurIds.length) return { data: [], error: "Au moins un joueur requis" };
  const base = stripMulti(payload);

  if (!isSupabaseConfigured()) {
    const created = joueurIds.map((jid) =>
      localCreateProgrammation({ ...base, joueur_id: jid }, userId)
    );
    return { data: created };
  }

  try {
    const supabase = await getSupabaseServerDataClient();
    const rows = joueurIds.map((joueur_id) => ({
      ...base,
      joueur_id,
      created_by: userId ?? null,
      updated_at: new Date().toISOString(),
    }));
    const { data, error } = await supabase.from(TABLE).insert(rows).select("*");
    if (error) return { data: [], error: error.message };
    return { data: (data ?? []) as ProgrammationEvenement[] };
  } catch (e) {
    return { data: [], error: e instanceof Error ? e.message : String(e) };
  }
}

export async function updateProgrammationEvenement(
  id: string,
  patch: Partial<ProgrammationEvenementInput>
): Promise<{ data: ProgrammationEvenement | null; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { data: localUpdateProgrammation(id, patch) };
  }
  try {
    const supabase = await getSupabaseServerDataClient();
    const { data, error } = await supabase
      .from(TABLE)
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (error) return { data: null, error: error.message };
    return { data: (data as ProgrammationEvenement) ?? null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function deleteProgrammationEvenement(
  id: string
): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: localDeleteProgrammation(id) };
  }
  try {
    const supabase = await getSupabaseServerDataClient();
    const { error } = await supabase.from(TABLE).delete().eq("id", id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function getProgrammationJoueurStats(
  joueurId: string,
  annee?: number
): Promise<{ data: ProgrammationJoueurStats; error?: string }> {
  const year = annee ?? new Date().getFullYear();
  if (!isSupabaseConfigured()) {
    return { data: localStatsProgrammationJoueur(joueurId, year) };
  }
  try {
    const { data: events } = await listProgrammationForJoueur(joueurId, {
      dateDebut: `${year}-01-01`,
      dateFin: `${year}-12-31`,
    });
    const tournois = events.filter((e) =>
      ["tournoi_itf", "tournoi_atp_wta", "coupe_davis", "bjk_cup"].includes(e.type)
    ).length;
    const stages = events.filter((e) =>
      ["stage_national", "stage_etranger"].includes(e.type)
    ).length;
    let competitionDays = 0;
    let reposDays = 0;
    for (const e of events) {
      const days =
        differenceInCalendarDays(parseISO(e.date_fin), parseISO(e.date_debut)) + 1;
      if (e.type === "repos" || e.type === "blessure") reposDays += days;
      else competitionDays += days;
    }
    const pays = [...new Set(events.map((e) => e.pays).filter(Boolean) as string[])];
    return {
      data: {
        joueurId,
        annee: year,
        tournois,
        stages,
        semainesCompetition: Math.round(competitionDays / 7),
        semainesRepos: Math.round(reposDays / 7),
        paysVisites: pays,
        pointsGagnes: events.reduce((s, e) => s + (e.points_gagnes ?? 0), 0),
        prizeMoneyUsd: events.reduce((s, e) => s + Number(e.prize_money_usd ?? 0), 0),
      },
    };
  } catch (e) {
    return {
      data: {
        joueurId,
        annee: year,
        tournois: 0,
        stages: 0,
        semainesCompetition: 0,
        semainesRepos: 0,
        paysVisites: [],
        pointsGagnes: 0,
        prizeMoneyUsd: 0,
      },
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

export function parseProgrammationFiltersFromSearchParams(
  sp: URLSearchParams
): ProgrammationFilters {
  const type = sp.get("type");
  return {
    joueurId: sp.get("joueurId") ?? undefined,
    joueurIds: sp.getAll("joueurIds").filter(Boolean),
    type: type ? (type as ProgrammationFilters["type"]) : undefined,
    statut: (sp.get("statut") as ProgrammationStatut) ?? undefined,
    surface: (sp.get("surface") as ProgrammationFilters["surface"]) ?? undefined,
    dateDebut: sp.get("dateDebut") ?? undefined,
    dateFin: sp.get("dateFin") ?? undefined,
    search: sp.get("search") ?? undefined,
    categorieJoueur: sp.get("categorieJoueur") ?? undefined,
  };
}
