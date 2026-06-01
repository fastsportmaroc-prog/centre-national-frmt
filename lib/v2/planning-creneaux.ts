import { parseTerrainsBesoinsFromNotes } from "@/lib/data/terrains";
import type { PlanningSeanceV2, StageProgrammeV2 } from "@/lib/types/v2";
import { creneauHorairesFixed, type CreneauType } from "@/lib/v2/reservations-utils";
import { eachDayOfStage } from "@/lib/v2/stage-calculations";
import { addDays, endOfWeek, format, startOfWeek } from "date-fns";

export type PlanningCreneauSlot = "matin" | "apres_midi" | "journee";

export const PLANNING_CRENEAU_LABELS: Record<PlanningCreneauSlot, string> = {
  matin: "Matin (09:00-13:00)",
  apres_midi: "Après-midi (14:00-18:00)",
  journee: "Journée complète (09:00-18:00)",
};

export function terrainCreneauRawToSlot(raw: string): PlanningCreneauSlot {
  const c = raw.toLowerCase().replace(/-/g, "_");
  if (c.includes("apres")) return "apres_midi";
  if (c === "matin" || (c.includes("matin") && !c.includes("journee"))) return "matin";
  return "journee";
}

export function slotFromHoraires(heureDebut: string, heureFin: string): PlanningCreneauSlot {
  const d = String(heureDebut ?? "").slice(0, 5);
  const f = String(heureFin ?? "").slice(0, 5);
  if (d === "09:00" && f === "13:00") return "matin";
  if (d === "14:00" && f === "18:00") return "apres_midi";
  if (d === "09:00" && f === "18:00") return "journee";
  const hS = Number(d.slice(0, 2)) + Number(d.slice(3, 5)) / 60;
  const hE = Number(f.slice(0, 2)) + Number(f.slice(3, 5)) / 60;
  if (hS >= 13) return "apres_midi";
  if (hE <= 13.5) return "matin";
  return "journee";
}

export function horairesForPlanningSlot(slot: PlanningCreneauSlot): {
  heure_debut: string;
  heure_fin: string;
} {
  const type: CreneauType =
    slot === "apres_midi" ? "apres_midi" : slot === "matin" ? "matin" : "journee";
  const { debut, fin } = creneauHorairesFixed(type);
  return { heure_debut: debut, heure_fin: fin };
}

export type PlanningSessionRow = {
  id: string;
  stageId: string;
  stageName: string;
  categorie: string;
  date: string;
  creneau: PlanningCreneauSlot;
  heure_debut: string;
  heure_fin: string;
  nombre_joueurs: number;
  nombre_coachs: number;
  statut: string;
  hebergement: boolean;
  restauration: boolean;
  terrains: boolean;
  terrains_supplementaires: boolean;
  lettre_envoyee: boolean;
  licences_verifiees: boolean;
  observations: string;
};

function sessionKey(stageId: string, date: string, creneau: PlanningCreneauSlot, infraId?: string | null) {
  return `${stageId}|${date}|${creneau}|${infraId ?? ""}`;
}

function stageMeta(stage: StageProgrammeV2, statut: string): Omit<PlanningSessionRow, "id" | "stageId" | "stageName" | "categorie" | "date" | "creneau" | "heure_debut" | "heure_fin"> {
  const notes = stage.notes ?? "";
  const n = notes.toLowerCase();
  return {
    nombre_joueurs: Number(stage.nombre_joueurs ?? 0),
    nombre_coachs: Number(stage.nombre_encadrants ?? 0),
    statut,
    hebergement: Boolean(stage.hebergement),
    restauration: Boolean(stage.restauration),
    terrains: Boolean(stage.terrains),
    terrains_supplementaires: n.includes("[terrains_besoins:") || n.includes("terrain supp"),
    lettre_envoyee: n.includes("lettre envoy") || n.includes("lettre officielle générée"),
    licences_verifiees: n.includes("licences vérifiées") || n.includes("licence ok"),
    observations: notes.trim() || "—",
  };
}

function normalizeStageStatus(raw: unknown): string {
  return String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace("confirmé", "confirme")
    .replace("confirmée", "confirme")
    .replace("en cours", "en_cours");
}

function shouldIncludeStageStatus(status: string): boolean {
  return status === "prevu" || status === "confirme" || status === "en_cours";
}

function normalizeStageCategory(raw: unknown): string {
  const value = String(raw ?? "").trim();
  const lower = value.toLowerCase();
  if (lower === "senior" || lower === "seniors") return "Élite Pro";
  return value || "—";
}

/** Séances planning semaine : table `planning` + besoins terrains stage (09-13 / 14-18 / 09-18). */
export function buildPlanningSessionsForWeek(
  stages: StageProgrammeV2[],
  planningRows: PlanningSeanceV2[],
  selectedWeekStart: Date
): PlanningSessionRow[] {
  const weekStart = startOfWeek(selectedWeekStart, { weekStartsOn: 1 });
  const weekEnd = addDays(weekStart, 6);
  const stageById = new Map(stages.map((s) => [s.id, s]));
  const seen = new Set<string>();
  const out: PlanningSessionRow[] = [];

  const push = (row: PlanningSessionRow) => {
    const k = sessionKey(row.stageId, row.date, row.creneau, null);
    if (seen.has(k)) return;
    seen.add(k);
    out.push(row);
  };

  for (const p of planningRows) {
    const stage = stageById.get(p.stage_id);
    if (!stage) continue;
    const statut = normalizeStageStatus(stage.statut);
    if (!shouldIncludeStageStatus(statut)) continue;
    const day = String(p.date).slice(0, 10);
    const dayDate = new Date(`${day}T12:00:00`);
    if (dayDate < weekStart || dayDate > weekEnd) continue;

    const creneau = slotFromHoraires(p.heure_debut, p.heure_fin);
    const horaires = horairesForPlanningSlot(creneau);
    push({
      id: p.id,
      stageId: stage.id,
      stageName: stage.stage_action ?? "Stage",
      categorie: normalizeStageCategory(stage.categorie),
      date: day,
      creneau,
      heure_debut: p.heure_debut?.slice(0, 5) || horaires.heure_debut,
      heure_fin: p.heure_fin?.slice(0, 5) || horaires.heure_fin,
      ...stageMeta(stage, statut),
    });
  }

  for (const stage of stages) {
    const statut = normalizeStageStatus(stage.statut);
    if (!shouldIncludeStageStatus(statut)) continue;

    const besoins = parseTerrainsBesoinsFromNotes(stage.notes);
    if (!besoins?.length) continue;

    const stageDays = eachDayOfStage(stage.date_debut, stage.date_fin);
    for (const day of stageDays) {
      const dayDate = new Date(`${day}T12:00:00`);
      if (dayDate < weekStart || dayDate > weekEnd) continue;

      for (const besoin of besoins) {
        const jours =
          besoin.jours?.length ?
            besoin.jours.map((d) => d.slice(0, 10))
          : stageDays;
        if (!jours.includes(day)) continue;

        const creneaux = besoin.creneaux?.length ? besoin.creneaux : (["journee"] as const);
        for (const raw of creneaux) {
          const creneau = terrainCreneauRawToSlot(raw);
          const k = sessionKey(stage.id, day, creneau, besoin.terrainId);
          if (seen.has(k)) continue;
          seen.add(k);
          const horaires = horairesForPlanningSlot(creneau);
          push({
            id: `${stage.id}-${day}-${creneau}-${besoin.terrainId}`,
            stageId: stage.id,
            stageName: stage.stage_action ?? "Stage",
            categorie: normalizeStageCategory(stage.categorie),
            date: day,
            creneau,
            heure_debut: horaires.heure_debut,
            heure_fin: horaires.heure_fin,
            ...stageMeta(stage, statut),
          });
        }
      }
    }
  }

  return out.sort((a, b) => {
    const k1 = `${a.date}|${a.creneau}|${a.stageName}`;
    const k2 = `${b.date}|${b.creneau}|${b.stageName}`;
    return k1.localeCompare(k2);
  });
}

export function formatPlanningSlotLabel(slot: PlanningCreneauSlot): string {
  return PLANNING_CRENEAU_LABELS[slot];
}
