import { format, eachDayOfInterval, parseISO } from "date-fns";
import type { ReservationEnrichedV2 } from "@/lib/types/v2";
import { parseReservationDate, resolveCreneauType } from "@/lib/v2/reservations-utils";

export type MatrixCourt = {
  id: string;
  nom: string;
  surface: string | null;
};

export type ReservationsCourtDateMatrix = {
  dates: string[];
  courts: MatrixCourt[];
  getCell: (courtId: string, date: string) => ReservationEnrichedV2[];
};

const CRENEAU_SORT: Record<string, number> = {
  matin: 0,
  apres_midi: 1,
  journee: 2,
};

/** Colonnes continues entre la première et la dernière date (évite le saut visuel juin → août). */
function expandContinuousDates(dates: string[]): string[] {
  if (dates.length <= 1) return dates;
  const sorted = [...dates].sort();
  const start = parseISO(`${sorted[0]}T12:00:00`);
  const end = parseISO(`${sorted[sorted.length - 1]}T12:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return sorted;
  }
  return eachDayOfInterval({ start, end }).map((d) => format(d, "yyyy-MM-dd"));
}

export function buildReservationsCourtDateMatrix(
  rows: ReservationEnrichedV2[]
): ReservationsCourtDateMatrix {
  const dateSet = new Set<string>();
  const courtMap = new Map<string, MatrixCourt>();
  const cells = new Map<string, ReservationEnrichedV2[]>();

  for (const r of rows) {
    const dateKey = format(parseReservationDate(r.date_debut), "yyyy-MM-dd");
    dateSet.add(dateKey);
    const courtId = r.infrastructure_id;
    if (!courtMap.has(courtId)) {
      courtMap.set(courtId, {
        id: courtId,
        nom: r.court_nom?.trim() || `Terrain ${courtId.slice(0, 8)}`,
        surface: r.court_surface ?? null,
      });
    }
    const key = `${courtId}|${dateKey}`;
    const list = cells.get(key) ?? [];
    list.push(r);
    cells.set(key, list);
  }

  for (const list of cells.values()) {
    list.sort(
      (a, b) =>
        (CRENEAU_SORT[resolveCreneauType(a)] ?? 9) -
        (CRENEAU_SORT[resolveCreneauType(b)] ?? 9)
    );
  }

  const dates = expandContinuousDates([...dateSet].sort());
  const courts = [...courtMap.values()].sort((a, b) =>
    a.nom.localeCompare(b.nom, "fr", { sensitivity: "base" })
  );

  return {
    dates,
    courts,
    getCell(courtId, date) {
      return cells.get(`${courtId}|${date}`) ?? [];
    },
  };
}
