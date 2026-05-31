import { eachDayOfInterval, format, isSameDay, parseISO } from "date-fns";

/** Parse une date calendrier en heure locale (évite le décalage UTC sur YYYY-MM-DD). */
export function parseCalendarDate(value: string | null | undefined): Date {
  if (!value) return new Date(NaN);
  const raw = String(value).trim();
  const dateOnly = raw.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
    const [y, m, d] = dateOnly.split("-").map(Number);
    return new Date(y, m - 1, d, 12, 0, 0, 0);
  }
  const parsed = parseISO(raw);
  return parsed;
}

export function toDateKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function dateOnlyString(value: string | null | undefined): string {
  if (!value) return "";
  return String(value).trim().slice(0, 10);
}

/** Jours entre deux dates incluses ; retourne [] si invalide ou ordre inversé. */
export function safeEachDayInRange(startIso: string, endIso: string): Date[] {
  const start = parseCalendarDate(startIso);
  let end = parseCalendarDate(endIso || startIso);
  if (Number.isNaN(start.getTime())) return [];
  if (Number.isNaN(end.getTime())) end = start;
  if (end < start) return [start];
  try {
    return eachDayOfInterval({ start, end });
  } catch {
    return [start];
  }
}

export function rangesOverlap(
  rangeStart: string,
  rangeEnd: string,
  windowStart: string,
  windowEnd: string
): boolean {
  const a0 = dateOnlyString(rangeStart);
  const a1 = dateOnlyString(rangeEnd || rangeStart);
  const b0 = dateOnlyString(windowStart);
  const b1 = dateOnlyString(windowEnd);
  if (!a0 || !b0) return false;
  return a0 <= b1 && a1 >= b0;
}

export function isSameCalendarDay(a: Date, b: Date): boolean {
  return isSameDay(a, b);
}
