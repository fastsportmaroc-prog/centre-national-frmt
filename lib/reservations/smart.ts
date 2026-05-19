import type { Court, Reservation } from "@/lib/types/database";
import { hasReservationOverlap } from "@/lib/utils/reservations";
import { addMinutes, setHours, setMinutes, startOfDay } from "date-fns";

export const OPEN_HOUR = 8;
export const CLOSE_HOUR = 22;
export const DEFAULT_DURATION_MIN = 120;
export const SLOT_STEP_MIN = 30;

export type TimeSlot = {
  start: Date;
  end: Date;
  label: string;
};

export type CourtSuggestion = {
  court: Court;
  slot: TimeSlot;
  score: number;
};

function buildSlotsForDay(day: Date, durationMin: number): TimeSlot[] {
  const slots: TimeSlot[] = [];
  let cursor = setMinutes(setHours(startOfDay(day), OPEN_HOUR), 0);
  const dayEnd = setMinutes(setHours(startOfDay(day), CLOSE_HOUR), 0);

  while (addMinutes(cursor, durationMin) <= dayEnd) {
    const end = addMinutes(cursor, durationMin);
    slots.push({
      start: new Date(cursor),
      end,
      label: `${cursor.getHours().toString().padStart(2, "0")}:${cursor.getMinutes().toString().padStart(2, "0")} – ${end.getHours().toString().padStart(2, "0")}:${end.getMinutes().toString().padStart(2, "0")}`,
    });
    cursor = addMinutes(cursor, SLOT_STEP_MIN);
  }
  return slots;
}

export function getAvailableSlotsForCourt(
  courtId: string,
  day: Date,
  reservations: Reservation[],
  durationMin = DEFAULT_DURATION_MIN
): TimeSlot[] {
  const all = buildSlotsForDay(day, durationMin);
  return all.filter(
    (slot) =>
      !hasReservationOverlap(reservations, courtId, slot.start, slot.end)
  );
}

export function findAvailableCourts(
  debut: Date,
  fin: Date,
  courts: Court[],
  reservations: Reservation[]
): Court[] {
  return courts.filter(
    (c) =>
      c.actif &&
      !hasReservationOverlap(reservations, c.id, debut, fin)
  );
}

/** Suggestions classées : court + créneau les plus adaptés. */
export function suggestReservations(
  day: Date,
  courts: Court[],
  reservations: Reservation[],
  durationMin = DEFAULT_DURATION_MIN,
  preferredCourtId?: string
): CourtSuggestion[] {
  const activeCourts = courts.filter((c) => c.actif);
  const suggestions: CourtSuggestion[] = [];

  for (const court of activeCourts) {
    const slots = getAvailableSlotsForCourt(
      court.id,
      day,
      reservations,
      durationMin
    );
    for (const slot of slots) {
      let score = 100;
      if (court.id === preferredCourtId) score += 20;
      if (court.couvert) score += 5;
      const hour = slot.start.getHours();
      if (hour >= 9 && hour <= 11) score += 10;
      if (hour >= 14 && hour <= 17) score += 8;
      suggestions.push({ court, slot, score });
    }
  }

  return suggestions.sort((a, b) => b.score - a.score).slice(0, 12);
}

export function getNextAvailableSlot(
  courts: Court[],
  reservations: Reservation[],
  fromDate = new Date(),
  durationMin = DEFAULT_DURATION_MIN
): CourtSuggestion | null {
  for (let d = 0; d < 14; d++) {
    const day = new Date(fromDate);
    day.setDate(day.getDate() + d);
    const suggestions = suggestReservations(day, courts, reservations, durationMin);
    const now = Date.now();
    const future = suggestions.find((s) => s.slot.start.getTime() > now);
    if (future) return future;
  }
  return null;
}
