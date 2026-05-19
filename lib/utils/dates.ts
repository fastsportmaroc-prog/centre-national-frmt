import {
  format,
  parseISO,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  addDays,
  isWithinInterval,
} from "date-fns";
import { fr } from "date-fns/locale";

export { fr };

export function formatDate(date: string | Date, pattern = "dd MMM yyyy"): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, pattern, { locale: fr });
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "dd MMM yyyy · HH:mm", { locale: fr });
}

export function formatTime(date: string | Date): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "HH:mm", { locale: fr });
}

export function isToday(date: string | Date): boolean {
  const d = typeof date === "string" ? parseISO(date) : date;
  const now = new Date();
  return isWithinInterval(d, { start: startOfDay(now), end: endOfDay(now) });
}

export function getWeekDays(reference = new Date()): Date[] {
  const start = startOfWeek(reference, { weekStartsOn: 1 });
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function getWeekRange(reference = new Date()) {
  return {
    start: startOfWeek(reference, { weekStartsOn: 1 }),
    end: endOfWeek(reference, { weekStartsOn: 1 }),
  };
}
