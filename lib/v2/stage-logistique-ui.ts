import { differenceInCalendarDays, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { format } from "date-fns";

export function calcNuits(arrivee: string, depart: string): number {
  const a = parseISO(arrivee.slice(0, 10));
  const d = parseISO(depart.slice(0, 10));
  if (Number.isNaN(a.getTime()) || Number.isNaN(d.getTime())) return 0;
  return Math.max(0, differenceInCalendarDays(d, a));
}

export function daysBeforeStage(arrivee: string, stageDebut: string): number {
  const a = parseISO(arrivee.slice(0, 10));
  const s = parseISO(stageDebut.slice(0, 10));
  return Math.max(0, differenceInCalendarDays(s, a));
}

export function daysAfterStage(depart: string, stageFin: string): number {
  const d = parseISO(depart.slice(0, 10));
  const f = parseISO(stageFin.slice(0, 10));
  return Math.max(0, differenceInCalendarDays(d, f));
}

export function formatDayLabel(date: string): string {
  return format(parseISO(date.slice(0, 10)), "EEE dd/MM", { locale: fr });
}

export function formatDateFr(date: string): string {
  return format(parseISO(date.slice(0, 10)), "dd/MM/yyyy", { locale: fr });
}

export function personInitials(nom: string, prenom: string): string {
  return `${(prenom[0] ?? "").toUpperCase()}${(nom[0] ?? "").toUpperCase()}`;
}
