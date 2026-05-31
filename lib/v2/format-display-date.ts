import { differenceInCalendarDays, format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

/** Fuseau officiel Maroc (Casablanca). */
export const MOROCCO_TIMEZONE = "Africa/Casablanca";

const moroccoFmt = (options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("fr-MA", { ...options, timeZone: MOROCCO_TIMEZONE });

function calendarKeyFromParts(instant: Date): string {
  const parts = moroccoFmt({ year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(
    instant
  );
  let y = "";
  let m = "";
  let d = "";
  for (const p of parts) {
    if (p.type === "year") y = p.value;
    if (p.type === "month") m = p.value;
    if (p.type === "day") d = p.value;
  }
  return `${y}-${m}-${d}`;
}

/** Parse une date ISO (YYYY-MM-DD) sans décalage fuseau. */
export function parseDisplayDate(dateStr: string): Date {
  const day = dateStr.slice(0, 10);
  return parseISO(`${day}T12:00:00`);
}

export function isTodayMorocco(isoDate: string, instant: Date = new Date()): boolean {
  return isoDate.slice(0, 10) === calendarKeyFromParts(instant);
}

export function isTomorrowMorocco(isoDate: string, instant: Date = new Date()): boolean {
  const tomorrow = new Date(instant.getTime() + 86_400_000);
  return isoDate.slice(0, 10) === calendarKeyFromParts(tomorrow);
}

/** Vendredi 29 mai 2026 (heure Maroc) */
export function formatDateLong(instant: Date = new Date()): string {
  const weekday = moroccoFmt({ weekday: "long" }).format(instant);
  const rest = moroccoFmt({ day: "numeric", month: "long", year: "numeric" }).format(instant);
  return `${weekday} ${rest}`;
}

/** Bloc en-tête — heure et date au Maroc */
export function formatDateHeaderParts(instant: Date = new Date()) {
  const weekday = moroccoFmt({ weekday: "long" }).format(instant);
  const day = moroccoFmt({ day: "numeric" }).format(instant);
  const month = moroccoFmt({ month: "long" }).format(instant);
  const year = moroccoFmt({ year: "numeric" }).format(instant);
  const time = moroccoFmt({ hour: "2-digit", minute: "2-digit", hour12: false }).format(instant);
  const tzLabel = moroccoFmt({ timeZoneName: "short" }).format(instant);

  return {
    weekday,
    day,
    month,
    year,
    time,
    tzLabel,
    iso: calendarKeyFromParts(instant),
  };
}

/** 28 juil. 2026 → 08 août 2026 */
export function formatDateRangeShort(debut: string, fin: string): string {
  const d = parseDisplayDate(debut);
  const f = parseDisplayDate(fin);
  const dKey = debut.slice(0, 10);
  const fKey = fin.slice(0, 10);
  if (dKey === fKey) {
    return format(d, "d MMMM yyyy", { locale: fr });
  }
  const sameYear = d.getFullYear() === f.getFullYear();
  const sameMonth = sameYear && d.getMonth() === f.getMonth();
  if (sameMonth) {
    return `${format(d, "d", { locale: fr })} → ${format(f, "d MMMM yyyy", { locale: fr })}`;
  }
  if (sameYear) {
    return `${format(d, "d MMM", { locale: fr })} → ${format(f, "d MMM yyyy", { locale: fr })}`;
  }
  return `${format(d, "d MMM yyyy", { locale: fr })} → ${format(f, "d MMM yyyy", { locale: fr })}`;
}

/** Libellé jour pour timeline */
export function formatTimelineDayLabel(isoDate: string, instant: Date = new Date()): string {
  if (isTodayMorocco(isoDate, instant)) {
    const d = parseDisplayDate(isoDate);
    return `Aujourd'hui · ${format(d, "dd/MM/yyyy", { locale: fr })}`;
  }
  if (isTomorrowMorocco(isoDate, instant)) {
    const d = parseDisplayDate(isoDate);
    return `Demain · ${format(d, "dd/MM/yyyy", { locale: fr })}`;
  }
  const d = parseDisplayDate(isoDate);
  return format(d, "EEE dd MMM yyyy", { locale: fr });
}

/** Notifications — heure affichée au fuseau Maroc */
export function formatNotificationWhen(iso: string, instant: Date = new Date()): {
  relative: string;
  time: string;
  full: string;
} {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return { relative: "—", time: "", full: "—" };
  }
  const time = moroccoFmt({ hour: "2-digit", minute: "2-digit", hour12: false }).format(d);
  const alertDay = calendarKeyFromParts(d);
  const todayKey = calendarKeyFromParts(instant);

  let relative: string;
  const dayDiff = differenceInCalendarDays(
    parseDisplayDate(todayKey),
    parseDisplayDate(alertDay)
  );
  if (dayDiff === 0) relative = "Aujourd'hui";
  else if (dayDiff === 1) relative = "Hier";
  else if (dayDiff > 1 && dayDiff < 7) relative = `Il y a ${dayDiff} jours`;
  else {
    relative = moroccoFmt({ day: "numeric", month: "long", year: "numeric" }).format(d);
  }
  const full = `${relative} · ${time} (Maroc)`;
  return { relative, time, full };
}

/** Date courte : 29 mai 2026 */
export function formatDateMedium(dateStr: string): string {
  return format(parseDisplayDate(dateStr), "d MMMM yyyy", { locale: fr });
}
