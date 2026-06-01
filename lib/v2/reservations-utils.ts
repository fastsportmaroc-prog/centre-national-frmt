import {
  addMonths,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  isWeekend,
  isWithinInterval,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { fr } from "date-fns/locale";
import type { ReservationEnrichedV2 } from "@/lib/types/v2";

/** Créneaux fixes — aucun créneau personnalisé */
export type CreneauType = "matin" | "apres_midi" | "journee";

export const CRENEAU_OPTIONS: { value: CreneauType; label: string; emoji: string }[] = [
  { value: "matin", label: "Matin", emoji: "🌅" },
  { value: "apres_midi", label: "Après-midi", emoji: "☀️" },
  { value: "journee", label: "Journée complète", emoji: "📅" },
];

export function creneauHorairesFixed(creneau: CreneauType): { debut: string; fin: string } {
  switch (creneau) {
    case "matin":
      return { debut: "09:00", fin: "13:00" };
    case "apres_midi":
      return { debut: "14:00", fin: "18:00" };
    case "journee":
    default:
      return { debut: "09:00", fin: "18:00" };
  }
}

export function normalizeCreneauType(raw: string | null | undefined): CreneauType {
  const s = (raw ?? "").toLowerCase().replace(/-/g, "_");
  if (s === "journee" || s === "journée" || s.includes("journee") || s.includes("journée")) return "journee";
  if (s === "matin") return "matin";
  if (s.includes("matin") && !s.includes("journee") && !s.includes("journée")) return "matin";
  if (s === "apres_midi" || s.includes("apres") || s.includes("après")) return "apres_midi";
  return "journee";
}

function creneauFromHeureFields(heureDebut?: string | null, heureFin?: string | null): CreneauType | null {
  const debut = (heureDebut ?? "").slice(0, 5);
  const fin = (heureFin ?? "").slice(0, 5);
  if (debut === "09:00" && fin === "18:00") return "journee";
  if (debut === "09:00" && fin === "13:00") return "matin";
  if (debut === "14:00" && fin === "18:00") return "apres_midi";
  return null;
}

export function inferCreneauFromTimes(debutIso: string, finIso: string): CreneauType {
  const start = parseReservationDate(debutIso);
  const end = parseReservationDate(finIso);
  const hStart = start.getHours() + start.getMinutes() / 60;
  const hEnd = end.getHours() + end.getMinutes() / 60;
  if (hStart < 12 && hEnd > 15) return "journee";
  if (hStart >= 13) return "apres_midi";
  if (hEnd <= 13.5) return "matin";
  return "journee";
}

export function resolveCreneauType(
  r: Pick<ReservationEnrichedV2, "creneau" | "date_debut" | "date_fin" | "heure_debut" | "heure_fin" | "stage_id">
): CreneauType {
  if (r.creneau) {
    return normalizeCreneauType(r.creneau);
  }
  const fromHeures = creneauFromHeureFields(r.heure_debut, r.heure_fin);
  if (fromHeures) return fromHeures;
  return inferCreneauFromTimes(r.date_debut, r.date_fin);
}

export type CreneauInfo = {
  type: CreneauType;
  label: string;
  emoji: string;
  badgeClass: string;
  heureDebut: string;
  heureFin: string;
};

const CRENEAU_META: Record<CreneauType, Omit<CreneauInfo, "heureDebut" | "heureFin">> = {
  matin: {
    type: "matin",
    label: "Matin",
    emoji: "🌅",
    badgeClass: "bg-sky-500/20 text-sky-700 border-sky-500/40",
  },
  apres_midi: {
    type: "apres_midi",
    label: "Après-midi",
    emoji: "☀️",
    badgeClass: "bg-orange-500/20 text-orange-700 border-orange-500/40",
  },
  journee: {
    type: "journee",
    label: "Journée complète",
    emoji: "📅",
    badgeClass: "bg-emerald-500/20 text-emerald-700 border-emerald-500/40",
  },
};

export function getCreneauInfo(
  debutIso: string,
  finIso: string,
  creneauStored?: string | null,
  heureDebut?: string | null,
  heureFin?: string | null
): CreneauInfo {
  const fromHeures = creneauFromHeureFields(heureDebut, heureFin);
  const type =
    fromHeures ??
    (creneauStored ?
      resolveCreneauType({
        creneau: creneauStored,
        date_debut: debutIso,
        date_fin: finIso,
        heure_debut: heureDebut,
        heure_fin: heureFin,
      })
    : inferCreneauFromTimes(debutIso, finIso));
  const { debut, fin } = creneauHorairesFixed(type);
  const meta = CRENEAU_META[type];
  return { ...meta, heureDebut: debut, heureFin: fin };
}

export function formatCreneauLabel(raw: string | null | undefined): string {
  const type = normalizeCreneauType(raw);
  return CRENEAU_OPTIONS.find((o) => o.value === type)?.label ?? "Journée complète";
}

export function getCreneauInfoForReservation(r: ReservationEnrichedV2): CreneauInfo {
  const type = resolveCreneauType(r);
  const { debut, fin } = creneauHorairesFixed(type);
  const meta = CRENEAU_META[type];
  return { ...meta, heureDebut: debut, heureFin: fin };
}

export function buildReservationDateTimes(
  date: string,
  creneau: CreneauType
): { date_debut: string; date_fin: string; heure_debut: string; heure_fin: string; creneau: CreneauType } {
  const { debut, fin } = creneauHorairesFixed(creneau);
  return {
    creneau,
    heure_debut: debut,
    heure_fin: fin,
    date_debut: combineDateTime(date, debut),
    date_fin: combineDateTime(date, fin),
  };
}

export function parseReservationDate(iso: string): Date {
  const raw = String(iso).trim();
  const dateOnly = raw.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
    const [y, m, d] = dateOnly.split("-").map(Number);
    return new Date(y, m - 1, d, 12, 0, 0, 0);
  }
  return parseISO(raw.includes("T") ? raw : `${raw}T12:00:00`);
}

export function formatDateLong(iso: string): string {
  const d = parseReservationDate(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return format(d, "EEEE d MMMM yyyy", { locale: fr });
}

export function formatDateHeader(iso: string): string {
  const d = parseReservationDate(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  const label = format(d, "EEEE d MMMM yyyy", { locale: fr });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function formatTime(iso: string): string {
  const d = parseISO(iso.includes("T") ? iso : `${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return format(d, "HH:mm", { locale: fr });
}

export function combineDateTime(date: string, time: string): string {
  return `${date}T${time}:00`;
}

export function creneauxOverlap(a: CreneauType, b: CreneauType): boolean {
  if (a === "journee" || b === "journee") return true;
  return a === b;
}

export function normalizeSurface(surface: string | null | undefined): string {
  const s = (surface ?? "").toLowerCase();
  if (s.includes("terre") || s.includes("battue")) return "terre_battue";
  if (s.includes("dur") || s.includes("hard")) return "dur";
  if (s.includes("gazon") || s.includes("grass")) return "gazon";
  return "autre";
}

export function surfaceLabel(surface: string | null | undefined): string {
  const n = normalizeSurface(surface);
  if (n === "terre_battue") return "Terre battue";
  if (n === "dur") return "Dur";
  if (n === "gazon") return "Gazon";
  return surface || "Non défini";
}

export function surfaceShort(surface: string | null | undefined): string {
  const n = normalizeSurface(surface);
  if (n === "terre_battue") return "TB";
  if (n === "dur") return "D";
  if (n === "gazon") return "G";
  return "";
}

export function infraLine(r: ReservationEnrichedV2): string {
  const nom = r.court_nom ?? "Infrastructure";
  const surf = surfaceLabel(r.court_surface);
  const isFitness =
    (r.infrastructure_type ?? "").toLowerCase().includes("fitness") ||
    nom.toLowerCase().includes("fitness") ||
    nom.toLowerCase().includes("salle");
  if (isFitness) return `🏋️ ${nom}`;
  if (surf && surf !== "Non défini") return `🎾 ${nom} — ${surf}`;
  return `🎾 ${nom}`;
}

export function normalizeStatut(statut: string): string {
  const s = statut.toLowerCase();
  if (s.includes("annul")) return "annule";
  if (s.includes("confirm")) return "confirme";
  return "prevu";
}

export function statutLabel(statut: string): string {
  const n = normalizeStatut(statut);
  if (n === "confirme") return "Confirmé";
  if (n === "annule") return "Annulé";
  return "Prévu";
}

export type PeriodeFilter = "week" | "month" | "next_month" | "all";

export function matchPeriode(debutIso: string, periode: PeriodeFilter): boolean {
  if (periode === "all") return true;
  const d = parseReservationDate(debutIso);
  const now = new Date();
  if (periode === "week") {
    return isWithinInterval(d, {
      start: startOfWeek(now, { weekStartsOn: 1 }),
      end: endOfWeek(now, { weekStartsOn: 1 }),
    });
  }
  if (periode === "month") {
    return isWithinInterval(d, { start: startOfMonth(now), end: endOfMonth(now) });
  }
  const next = addMonths(now, 1);
  return isWithinInterval(d, { start: startOfMonth(next), end: endOfMonth(next) });
}

export function detectConflicts(items: ReservationEnrichedV2[]): Set<string> {
  const conflictIds = new Set<string>();
  const active = items.filter((r) => normalizeStatut(r.statut) !== "annule");

  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      const a = active[i]!;
      const b = active[j]!;
      if (a.infrastructure_id !== b.infrastructure_id) continue;
      const dayA = format(parseReservationDate(a.date_debut), "yyyy-MM-dd");
      const dayB = format(parseReservationDate(b.date_debut), "yyyy-MM-dd");
      if (dayA !== dayB) continue;
      const ca = resolveCreneauType(a);
      const cb = resolveCreneauType(b);
      if (creneauxOverlap(ca, cb)) {
        conflictIds.add(a.id);
        conflictIds.add(b.id);
      }
    }
  }
  return conflictIds;
}

export function conflictStageNames(
  r: ReservationEnrichedV2,
  all: ReservationEnrichedV2[],
  conflictIds: Set<string>
): string {
  if (!conflictIds.has(r.id)) return "";
  const day = format(parseReservationDate(r.date_debut), "yyyy-MM-dd");
  const myCreneau = resolveCreneauType(r);
  const names = new Set<string>();
  for (const o of all) {
    if (o.id === r.id || !conflictIds.has(o.id)) continue;
    if (o.infrastructure_id !== r.infrastructure_id) continue;
    if (format(parseReservationDate(o.date_debut), "yyyy-MM-dd") !== day) continue;
    if (!creneauxOverlap(myCreneau, resolveCreneauType(o))) continue;
    if (o.stage_nom) names.add(o.stage_nom);
  }
  return [...names].join(" + ");
}

/** Grille calendrier (autre module) */
export function getCreneauGridSlot(
  debutIso: string,
  finIso: string,
  creneauStored?: string | null
): { startHour: number; endHour: number; label: string; type: CreneauType } {
  const info = getCreneauInfo(debutIso, finIso, creneauStored);
  if (info.type === "matin") return { startHour: 9, endHour: 13, label: info.label, type: info.type };
  if (info.type === "apres_midi") return { startHour: 14, endHour: 18, label: info.label, type: info.type };
  return { startHour: 9, endHour: 18, label: info.label, type: info.type };
}

export function isWeekendDay(iso: string): boolean {
  return isWeekend(parseReservationDate(iso));
}
