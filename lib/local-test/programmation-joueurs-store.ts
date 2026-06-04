import type {
  ProgrammationEvenement,
  ProgrammationEvenementInput,
  ProgrammationFilters,
  ProgrammationJoueurStats,
} from "@/lib/types/programmation-joueurs";
import { newLocalId, readJson, writeJson } from "@/lib/local-test/storage";
import { differenceInCalendarDays, parseISO } from "date-fns";

const KEY = "programmation_evenements";

function now() {
  return new Date().toISOString();
}

function loadAll(): ProgrammationEvenement[] {
  return readJson<ProgrammationEvenement[]>(KEY, []);
}

function saveAll(items: ProgrammationEvenement[]) {
  writeJson(KEY, items);
}

function matchesFilters(e: ProgrammationEvenement, f?: ProgrammationFilters): boolean {
  if (!f) return true;
  if (f.joueurId && e.joueur_id !== f.joueurId) return false;
  if (f.joueurIds?.length && !f.joueurIds.includes(e.joueur_id)) return false;
  if (f.type) {
    const types = Array.isArray(f.type) ? f.type : [f.type];
    if (!types.includes(e.type)) return false;
  }
  if (f.statut && e.statut !== f.statut) return false;
  if (f.surface && e.surface !== f.surface) return false;
  if (f.dateDebut && e.date_fin < f.dateDebut.slice(0, 10)) return false;
  if (f.dateFin && e.date_debut > f.dateFin.slice(0, 10)) return false;
  if (f.search) {
    const q = f.search.toLowerCase();
    const hay = `${e.nom} ${e.ville ?? ""} ${e.pays ?? ""}`.toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}

function resolveStatut(e: ProgrammationEvenement): ProgrammationEvenement {
  const today = new Date().toISOString().slice(0, 10);
  if (e.statut === "termine") return e;
  if (e.date_fin < today) return { ...e, statut: "termine" };
  if (e.date_debut <= today && e.date_fin >= today) return { ...e, statut: "en_cours" };
  return { ...e, statut: "a_venir" };
}

export function localListProgrammation(f?: ProgrammationFilters): ProgrammationEvenement[] {
  return loadAll()
    .map(resolveStatut)
    .filter((e) => matchesFilters(e, f))
    .sort((a, b) => a.date_debut.localeCompare(b.date_debut));
}

export function localGetProgrammation(id: string): ProgrammationEvenement | null {
  return loadAll().find((e) => e.id === id) ?? null;
}

export function localCreateProgrammation(
  input: ProgrammationEvenementInput,
  userId?: string | null
): ProgrammationEvenement {
  const t = now();
  const row: ProgrammationEvenement = {
    id: newLocalId(),
    ...input,
    created_by: userId ?? null,
    created_at: t,
    updated_at: t,
  };
  saveAll([...loadAll(), row]);
  return row;
}

export function localUpdateProgrammation(
  id: string,
  patch: Partial<ProgrammationEvenementInput>
): ProgrammationEvenement | null {
  const all = loadAll();
  const idx = all.findIndex((e) => e.id === id);
  if (idx < 0) return null;
  const next = { ...all[idx]!, ...patch, updated_at: now() };
  all[idx] = next;
  saveAll(all);
  return next;
}

export function localDeleteProgrammation(id: string): boolean {
  const all = loadAll();
  const next = all.filter((e) => e.id !== id);
  if (next.length === all.length) return false;
  saveAll(next);
  return true;
}

export function localStatsProgrammationJoueur(
  joueurId: string,
  annee: number
): ProgrammationJoueurStats {
  const yearPrefix = String(annee);
  const events = loadAll().filter(
    (e) => e.joueur_id === joueurId && e.date_debut.startsWith(yearPrefix)
  );
  const tournois = events.filter((e) =>
    ["tournoi_itf", "tournoi_atp_wta", "coupe_davis", "bjk_cup"].includes(e.type)
  ).length;
  const stages = events.filter((e) =>
    ["stage_national", "stage_etranger"].includes(e.type)
  ).length;
  const repos = events.filter((e) => e.type === "repos" || e.type === "blessure").length;
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
    joueurId,
    annee,
    tournois,
    stages,
    semainesCompetition: Math.round(competitionDays / 7),
    semainesRepos: Math.round(reposDays / 7),
    paysVisites: pays,
    pointsGagnes: events.reduce((s, e) => s + (e.points_gagnes ?? 0), 0),
    prizeMoneyUsd: events.reduce((s, e) => s + Number(e.prize_money_usd ?? 0), 0),
  };
}
