import { getCreneauRange, normalizeCreneauKey } from "./terrain-constants";

export interface ConflictReservation {
  id: string;
  stage_id: string | null;
  terrain_id: string;
  date: string;
  creneau: string;
  heure_debut?: string | null;
  heure_fin?: string | null;
}

export interface TerrainConflict {
  reservationId: string;
  conflictingReservationId: string;
  terrain_id: string;
  date: string;
  reason: string;
}

export function toMinutes(time: string): number {
  const parts = time.split(":");
  const h = Number(parts[0] ?? 0);
  const m = Number(parts[1] ?? 0);
  return h * 60 + m;
}

export function timeSlotsOverlap(
  slot1: { start: string; end: string },
  slot2: { start: string; end: string }
): boolean {
  const s1 = toMinutes(slot1.start);
  const e1 = toMinutes(slot1.end);
  const s2 = toMinutes(slot2.start);
  const e2 = toMinutes(slot2.end);
  return s1 < e2 && e1 > s2;
}

export function getTimeRange(reservation: Pick<
  ConflictReservation,
  "creneau" | "heure_debut" | "heure_fin"
>): { start: number; end: number } {
  if (reservation.heure_debut && reservation.heure_fin) {
    return {
      start: toMinutes(reservation.heure_debut.slice(0, 5)),
      end: toMinutes(reservation.heure_fin.slice(0, 5)),
    };
  }
  const range = getCreneauRange(reservation.creneau);
  return { start: toMinutes(range.start), end: toMinutes(range.end) };
}

function rangesOverlap(
  a: { start: number; end: number },
  b: { start: number; end: number }
): boolean {
  return a.start < b.end && a.end > b.start;
}

function sameStage(a: ConflictReservation, b: ConflictReservation): boolean {
  return Boolean(a.stage_id && b.stage_id && a.stage_id === b.stage_id);
}

export function detectConflicts(
  reservations: ConflictReservation[],
  options: { excludeStageId?: string; excludeId?: string } = {}
): TerrainConflict[] {
  const active = reservations.filter((r) => r.terrain_id && r.date);
  const conflicts: TerrainConflict[] = [];

  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      const a = active[i]!;
      const b = active[j]!;

      if (a.id === b.id) continue;
      if (sameStage(a, b)) continue;
      if (options.excludeStageId && (a.stage_id === options.excludeStageId || b.stage_id === options.excludeStageId)) {
        if (a.stage_id === b.stage_id) continue;
      }
      if (options.excludeId && (a.id === options.excludeId || b.id === options.excludeId)) continue;
      if (a.terrain_id !== b.terrain_id) continue;
      if (a.date.slice(0, 10) !== b.date.slice(0, 10)) continue;

      const rangeA = getTimeRange(a);
      const rangeB = getTimeRange(b);
      if (!rangesOverlap(rangeA, rangeB)) continue;

      conflicts.push({
        reservationId: a.id,
        conflictingReservationId: b.id,
        terrain_id: a.terrain_id,
        date: a.date.slice(0, 10),
        reason: `Conflit horaire: ${normalizeCreneauKey(a.creneau)} vs ${normalizeCreneauKey(b.creneau)}`,
      });
    }
  }

  return conflicts;
}

export function hasConflict(
  newReservation: Omit<ConflictReservation, "id">,
  existingReservations: ConflictReservation[],
  options: { excludeId?: string } = {}
): boolean {
  const newRange = getTimeRange({ ...newReservation, id: "__new__" } as ConflictReservation);
  const day = newReservation.date.slice(0, 10);

  return existingReservations.some((existing) => {
    if (options.excludeId && existing.id === options.excludeId) return false;
    if (existing.stage_id && newReservation.stage_id && existing.stage_id === newReservation.stage_id) {
      return false;
    }
    if (existing.terrain_id !== newReservation.terrain_id) return false;
    if (existing.date.slice(0, 10) !== day) return false;
    const existingRange = getTimeRange(existing);
    return rangesOverlap(newRange, existingRange);
  });
}

export function conflictIdSet(conflicts: TerrainConflict[]): Set<string> {
  const ids = new Set<string>();
  for (const c of conflicts) {
    ids.add(c.reservationId);
    ids.add(c.conflictingReservationId);
  }
  return ids;
}
