import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  eachDayOfInterval,
  endOfMonth,
  endOfQuarter,
  format,
  isValid,
  parseISO,
  startOfMonth,
  startOfQuarter,
} from "date-fns";
import { fr } from "date-fns/locale";
import type { PlanningCnePeriodPreset } from "@/lib/programmation-joueurs/planning-cne-grid";
import { parseFrenchDateInput } from "@/lib/utils/french-date-input";

/** Limite d'affichage pour éviter le gel du navigateur. */
export const PLANNING_CNE_MAX_DAYS = 124;

function parseDay(iso?: string | null): Date | null {
  if (!iso?.trim()) return null;
  const normalized = parseFrenchDateInput(iso) ?? iso.slice(0, 10);
  const d = parseISO(normalized);
  return isValid(d) ? d : null;
}

export function sanitizePlanningCneRange(
  startStr: string,
  endStr: string
): { start: string; end: string; truncated: boolean } {
  let start = parseDay(startStr);
  let end = parseDay(endStr);

  if (!start && !end) {
    const now = new Date();
    start = startOfMonth(now);
    end = endOfMonth(now);
  } else if (start && !end) {
    end = start;
  } else if (!start && end) {
    start = end;
  }

  if (!start || !end) {
    const now = new Date();
    start = startOfMonth(now);
    end = endOfMonth(now);
  }

  if (start > end) {
    const tmp = start;
    start = end;
    end = tmp;
  }

  let truncated = false;
  const dayCount = differenceInCalendarDays(end, start) + 1;
  if (dayCount > PLANNING_CNE_MAX_DAYS) {
    end = addDays(start, PLANNING_CNE_MAX_DAYS - 1);
    truncated = true;
  }

  return {
    start: format(start, "yyyy-MM-dd"),
    end: format(end, "yyyy-MM-dd"),
    truncated,
  };
}

export function rangeForCnePreset(
  preset: PlanningCnePeriodPreset,
  custom?: { dateDebut?: string; dateFin?: string }
): { start: string; end: string; truncated: boolean } {
  const now = new Date();

  if (preset === "mois_precedent") {
    const prev = addMonths(now, -1);
    return sanitizePlanningCneRange(
      format(startOfMonth(prev), "yyyy-MM-dd"),
      format(endOfMonth(prev), "yyyy-MM-dd")
    );
  }

  if (preset === "mois_prochain") {
    const next = addMonths(now, 1);
    return sanitizePlanningCneRange(
      format(startOfMonth(next), "yyyy-MM-dd"),
      format(endOfMonth(next), "yyyy-MM-dd")
    );
  }

  if (preset === "trimestre") {
    return sanitizePlanningCneRange(
      format(startOfQuarter(now), "yyyy-MM-dd"),
      format(endOfQuarter(now), "yyyy-MM-dd")
    );
  }

  if (preset === "personnalise") {
    const debut = custom?.dateDebut?.slice(0, 10);
    const fin = custom?.dateFin?.slice(0, 10);
    if (debut || fin) {
      return sanitizePlanningCneRange(debut ?? fin ?? "", fin ?? debut ?? "");
    }
  }

  return sanitizePlanningCneRange(
    format(startOfMonth(now), "yyyy-MM-dd"),
    format(endOfMonth(now), "yyyy-MM-dd")
  );
}

export function formatPlanningCnePeriodFr(start: string, end: string): string {
  const s = parseDay(start);
  const e = parseDay(end);
  if (!s || !e) return "—";
  if (format(s, "yyyy-MM-dd") === format(e, "yyyy-MM-dd")) {
    return format(s, "EEEE d MMMM yyyy", { locale: fr });
  }
  const debut = format(s, "d MMMM yyyy", { locale: fr });
  const fin = format(e, "d MMMM yyyy", { locale: fr });
  return `Du ${debut} au ${fin}`;
}

export function formatPlanningCneDayFr(iso: string): string {
  const d = parseDay(iso);
  if (!d) return "—";
  return format(d, "dd/MM/yyyy", { locale: fr });
}

export function safeEachDayInRange(startStr: string, endStr: string): Date[] {
  const { start, end } = sanitizePlanningCneRange(startStr, endStr);
  try {
    return eachDayOfInterval({
      start: parseISO(start),
      end: parseISO(end),
    });
  } catch {
    return [];
  }
}

export function capitalizeFr(text: string): string {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}
