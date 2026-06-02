import { reservationToConflictRow } from "@/lib/terrain/conflict-adapters";
import {
  conflictIdSet,
  detectConflicts as detectTerrainConflicts,
  getTimeRange,
  toMinutes,
} from "@/services/conflictDetector";
import type { PlanningSeanceV2, ReservationEnrichedV2 } from "@/lib/types/v2";
import { dedupeReservationsForDisplay, normalizeStatut } from "@/lib/v2/reservations-utils";

export type PlannerConflictKind =
  | "terrain_overlap"
  | "terrain_programme"
  | "planning_sans_reservation"
  | "reservation_sans_programme";

export type PlannerConflict = {
  id: string;
  kind: PlannerConflictKind;
  date: string;
  infrastructure_id: string;
  court_nom?: string | null;
  message: string;
  reservation_ids: string[];
  planning_ids: string[];
  stage_labels: string[];
};

type TimeSlot = {
  id: string;
  source: "reservation" | "planning";
  stage_id: string | null;
  infrastructure_id: string;
  date: string;
  label: string;
  range: { start: number; end: number };
};

function planningToRange(p: PlanningSeanceV2): { start: number; end: number } {
  const debut = (p.heure_debut ?? "09:00").slice(0, 5);
  const fin = (p.heure_fin ?? "18:00").slice(0, 5);
  return { start: toMinutes(debut), end: toMinutes(fin) };
}

function reservationSlot(r: ReservationEnrichedV2): TimeSlot {
  const row = reservationToConflictRow(r);
  const range = getTimeRange(row);
  return {
    id: r.id,
    source: "reservation",
    stage_id: r.stage_id ?? null,
    infrastructure_id: r.infrastructure_id,
    date: String(r.date_debut).slice(0, 10),
    label: r.stage_nom ?? "Réservation",
    range,
  };
}

function planningSlot(
  p: PlanningSeanceV2 & { stage_nom?: string | null; court_nom?: string | null }
): TimeSlot | null {
  if (!p.infrastructure_id || !p.stage_id) return null;
  const day = String(p.date).slice(0, 10);
  return {
    id: p.id,
    source: "planning",
    stage_id: p.stage_id,
    infrastructure_id: p.infrastructure_id,
    date: day,
    label: p.stage_nom ?? "Planning",
    range: planningToRange(p),
  };
}

function rangesOverlap(a: { start: number; end: number }, b: { start: number; end: number }): boolean {
  return a.start < b.end && a.end > b.start;
}

function sameStage(a: string | null, b: string | null): boolean {
  return Boolean(a && b && a === b);
}

export function analyzePlannerConflicts(
  reservations: ReservationEnrichedV2[],
  planning: Array<PlanningSeanceV2 & { stage_nom?: string | null; court_nom?: string | null }>
): {
  conflicts: PlannerConflict[];
  terrainConflictIds: Set<string>;
  reservationIdsSansProgramme: Set<string>;
  planningIdsSansReservation: Set<string>;
} {
  const activeReservations = dedupeReservationsForDisplay(reservations).filter(
    (r) => normalizeStatut(r.statut) !== "annule"
  );
  const resSlots = activeReservations.map(reservationSlot);
  const planSlots = planning.map(planningSlot).filter((s): s is TimeSlot => s !== null);

  const terrainConflictIds = conflictIdSet(detectTerrainConflicts(activeReservations.map(reservationToConflictRow)));
  const conflicts: PlannerConflict[] = [];
  const reservationIdsSansProgramme = new Set<string>();
  const planningIdsSansReservation = new Set<string>();
  const infraNames = new Map<string, string>();
  for (const r of activeReservations) {
    if (r.court_nom) infraNames.set(r.infrastructure_id, r.court_nom);
  }
  for (const p of planning) {
    if (p.infrastructure_id && p.court_nom) infraNames.set(p.infrastructure_id, p.court_nom);
  }

  for (const id of terrainConflictIds) {
    const r = activeReservations.find((x) => x.id === id);
    if (!r) continue;
    conflicts.push({
      id: `terrain-${id}`,
      kind: "terrain_overlap",
      date: String(r.date_debut).slice(0, 10),
      infrastructure_id: r.infrastructure_id,
      court_nom: r.court_nom,
      message: "Double réservation terrain (stages différents)",
      reservation_ids: [id],
      planning_ids: [],
      stage_labels: [r.stage_nom ?? "—"].filter(Boolean),
    });
  }

  for (let i = 0; i < resSlots.length; i++) {
    for (let j = 0; j < planSlots.length; j++) {
      const a = resSlots[i]!;
      const b = planSlots[j]!;
      if (a.infrastructure_id !== b.infrastructure_id) continue;
      if (a.date !== b.date) continue;
      if (!rangesOverlap(a.range, b.range)) continue;
      if (sameStage(a.stage_id, b.stage_id)) continue;

      conflicts.push({
        id: `tp-${a.id}-${b.id}`,
        kind: "terrain_programme",
        date: a.date,
        infrastructure_id: a.infrastructure_id,
        court_nom: infraNames.get(a.infrastructure_id),
        message: "Conflit terrain ↔ programme (stages différents)",
        reservation_ids: [a.id],
        planning_ids: [b.id],
        stage_labels: [a.label, b.label],
      });
    }
  }

  for (const p of planSlots) {
    const hasMatchingReservation = resSlots.some(
      (r) =>
        r.infrastructure_id === p.infrastructure_id &&
        r.date === p.date &&
        sameStage(r.stage_id, p.stage_id) &&
        rangesOverlap(r.range, p.range)
    );
    if (!hasMatchingReservation) {
      planningIdsSansReservation.add(p.id);
      conflicts.push({
        id: `ps-${p.id}`,
        kind: "planning_sans_reservation",
        date: p.date,
        infrastructure_id: p.infrastructure_id,
        court_nom: infraNames.get(p.infrastructure_id),
        message: "Séance planning sans réservation terrain alignée",
        reservation_ids: [],
        planning_ids: [p.id],
        stage_labels: [p.label],
      });
    }
  }

  for (const r of resSlots) {
    const hasMatchingPlanning = planSlots.some(
      (p) =>
        p.infrastructure_id === r.infrastructure_id &&
        p.date === r.date &&
        sameStage(p.stage_id, r.stage_id) &&
        rangesOverlap(p.range, r.range)
    );
    if (!hasMatchingPlanning && r.stage_id) {
      reservationIdsSansProgramme.add(r.id);
      conflicts.push({
        id: `rs-${r.id}`,
        kind: "reservation_sans_programme",
        date: r.date,
        infrastructure_id: r.infrastructure_id,
        court_nom: infraNames.get(r.infrastructure_id),
        message: "Réservation terrain sans séance planning correspondante",
        reservation_ids: [r.id],
        planning_ids: [],
        stage_labels: [r.label],
      });
    }
  }

  return {
    conflicts,
    terrainConflictIds,
    reservationIdsSansProgramme,
    planningIdsSansReservation,
  };
}

export function conflictKindLabel(kind: PlannerConflictKind): string {
  switch (kind) {
    case "terrain_overlap":
      return "Conflit terrain";
    case "terrain_programme":
      return "Terrain ↔ Programme";
    case "planning_sans_reservation":
      return "Programme sans réservation";
    case "reservation_sans_programme":
      return "Réservation sans programme";
    default:
      return "Conflit";
  }
}
