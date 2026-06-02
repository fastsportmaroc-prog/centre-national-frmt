import {
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subWeeks,
} from "date-fns";
import { fr } from "date-fns/locale";

export type PlannerPeriodMode = "week" | "month" | "year" | "all";

export type PlannerViewMode = "list" | "week" | "month" | "year";

export type PlannerRange = {
  dateDebut: string;
  dateFin: string;
  label: string;
};

export function parsePivotDate(iso: string): Date {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

export function resolvePlannerRange(mode: PlannerPeriodMode, pivotIso: string): PlannerRange | null {
  const pivot = parsePivotDate(pivotIso);
  if (mode === "all") return null;

  if (mode === "week") {
    const start = startOfWeek(pivot, { weekStartsOn: 1 });
    const end = endOfWeek(pivot, { weekStartsOn: 1 });
    return {
      dateDebut: format(start, "yyyy-MM-dd"),
      dateFin: format(end, "yyyy-MM-dd"),
      label: `Semaine du ${format(start, "d MMM", { locale: fr })} au ${format(end, "d MMM yyyy", { locale: fr })}`,
    };
  }

  if (mode === "year") {
    const start = startOfYear(pivot);
    const end = endOfYear(pivot);
    return {
      dateDebut: format(start, "yyyy-MM-dd"),
      dateFin: format(end, "yyyy-MM-dd"),
      label: `Année ${format(pivot, "yyyy")}`,
    };
  }

  const start = startOfMonth(pivot);
  const end = endOfMonth(pivot);
  return {
    dateDebut: format(start, "yyyy-MM-dd"),
    dateFin: format(end, "yyyy-MM-dd"),
    label: format(pivot, "MMMM yyyy", { locale: fr }),
  };
}

export function daysInPlannerRange(range: PlannerRange | null, pivotIso: string, mode: PlannerPeriodMode): string[] {
  if (!range) {
    const pivot = parsePivotDate(pivotIso);
    const start = startOfMonth(pivot);
    const end = endOfMonth(addMonths(pivot, 11));
    return eachDayOfInterval({ start, end }).map((d) => format(d, "yyyy-MM-dd"));
  }
  const start = parsePivotDate(range.dateDebut);
  const end = parsePivotDate(range.dateFin);
  return eachDayOfInterval({ start, end }).map((d) => format(d, "yyyy-MM-dd"));
}

export function shiftPlannerPivot(
  pivotIso: string,
  mode: PlannerPeriodMode,
  direction: -1 | 1
): string {
  const pivot = parsePivotDate(pivotIso);
  if (mode === "week") {
    const next = direction === 1 ? addWeeks(pivot, 1) : subWeeks(pivot, 1);
    return format(next, "yyyy-MM-dd");
  }
  if (mode === "year") {
    return format(
      new Date(pivot.getFullYear() + direction, pivot.getMonth(), pivot.getDate()),
      "yyyy-MM-dd"
    );
  }
  return format(addMonths(pivot, direction), "yyyy-MM-dd");
}

export function monthKeyFromDate(iso: string): string {
  return iso.slice(0, 7);
}

export function weeksInRange(range: PlannerRange): string[][] {
  const days = daysInPlannerRange(range, range.dateDebut, "month");
  const weeks: string[][] = [];
  let current: string[] = [];
  for (const day of days) {
    const dow = parsePivotDate(day).getDay();
    if (current.length === 0 && dow !== 1) {
      const pad = dow === 0 ? 6 : dow - 1;
      for (let i = 0; i < pad; i++) current.push("");
    }
    current.push(day);
    if (current.length === 7) {
      weeks.push(current);
      current = [];
    }
  }
  if (current.length) {
    while (current.length < 7) current.push("");
    weeks.push(current);
  }
  return weeks;
}
