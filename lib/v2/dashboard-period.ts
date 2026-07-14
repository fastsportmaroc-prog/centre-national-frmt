import {
  addMonths,
  endOfMonth,
  endOfQuarter,
  endOfWeek,
  format,
  startOfMonth,
  startOfQuarter,
  startOfWeek,
} from "date-fns";
import { fr } from "date-fns/locale";

export type DashboardPeriodPreset =
  | "cette_semaine"
  | "mois_precedent"
  | "ce_mois"
  | "mois_prochain"
  | "trimestre"
  | "personnalise";

export const DASHBOARD_PERIOD_OPTIONS: { value: DashboardPeriodPreset; label: string }[] = [
  { value: "cette_semaine", label: "Cette semaine" },
  { value: "mois_precedent", label: "Mois précédent" },
  { value: "ce_mois", label: "Ce mois" },
  { value: "mois_prochain", label: "Mois prochain" },
  { value: "trimestre", label: "Trimestre" },
  { value: "personnalise", label: "Personnalisé" },
];

export type DashboardPeriod = { start: string; end: string };

const iso = (d: Date) => format(d, "yyyy-MM-dd");

/** Calcule la plage de dates (ISO yyyy-MM-dd) pour un preset donné. */
export function rangeForDashboardPreset(
  preset: DashboardPeriodPreset,
  custom?: Partial<DashboardPeriod>
): DashboardPeriod {
  const now = new Date();
  switch (preset) {
    case "cette_semaine":
      return {
        start: iso(startOfWeek(now, { weekStartsOn: 1 })),
        end: iso(endOfWeek(now, { weekStartsOn: 1 })),
      };
    case "mois_precedent": {
      const prev = addMonths(now, -1);
      return { start: iso(startOfMonth(prev)), end: iso(endOfMonth(prev)) };
    }
    case "mois_prochain": {
      const next = addMonths(now, 1);
      return { start: iso(startOfMonth(next)), end: iso(endOfMonth(next)) };
    }
    case "trimestre":
      return { start: iso(startOfQuarter(now)), end: iso(endOfQuarter(now)) };
    case "personnalise": {
      const start = custom?.start?.slice(0, 10) || iso(startOfMonth(now));
      const end = custom?.end?.slice(0, 10) || iso(endOfMonth(now));
      return start <= end ? { start, end } : { start: end, end: start };
    }
    case "ce_mois":
    default:
      return { start: iso(startOfMonth(now)), end: iso(endOfMonth(now)) };
  }
}

/** Plage équivalente sur la période précédente, pour comparer une évolution. */
export function previousComparableRange(period: DashboardPeriod): DashboardPeriod {
  const start = new Date(`${period.start}T00:00:00`);
  const end = new Date(`${period.end}T00:00:00`);
  const spanDays = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
  const prevEnd = new Date(start);
  prevEnd.setDate(prevEnd.getDate() - 1);
  const prevStart = new Date(prevEnd);
  prevStart.setDate(prevStart.getDate() - (spanDays - 1));
  return { start: iso(prevStart), end: iso(prevEnd) };
}

export function formatDashboardPeriodFr(period: DashboardPeriod): string {
  const s = new Date(`${period.start}T00:00:00`);
  const e = new Date(`${period.end}T00:00:00`);
  if (period.start === period.end) return format(s, "EEEE d MMMM yyyy", { locale: fr });
  return `${format(s, "d MMM yyyy", { locale: fr })} — ${format(e, "d MMM yyyy", { locale: fr })}`;
}

export function rangesOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string
): boolean {
  return aStart.slice(0, 10) <= bEnd.slice(0, 10) && aEnd.slice(0, 10) >= bStart.slice(0, 10);
}
