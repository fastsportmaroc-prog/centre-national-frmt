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
import { reservationMergeKey } from "@/lib/v2/terrain-reservation-map";
import { reservationToConflictRow } from "@/lib/terrain/conflict-adapters";
import {
  conflictIdSet,
  detectConflicts as detectTerrainConflicts,
  getTimeRange,
} from "@/services/conflictDetector";
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
  const ra = creneauHorairesFixed(a);
  const rb = creneauHorairesFixed(b);
  const s1 = Number(ra.debut.slice(0, 2)) * 60 + Number(ra.debut.slice(3, 5));
  const e1 = Number(ra.fin.slice(0, 2)) * 60 + Number(ra.fin.slice(3, 5));
  const s2 = Number(rb.debut.slice(0, 2)) * 60 + Number(rb.debut.slice(3, 5));
  const e2 = Number(rb.fin.slice(0, 2)) * 60 + Number(rb.fin.slice(3, 5));
  return s1 < e2 && e1 > s2;
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

/** Plage ISO (yyyy-MM-dd) pour charger les réservations côté serveur. */
export function periodeToIsoRange(periode: PeriodeFilter): { dateDebut: string; dateFin: string } | null {
  if (periode === "all") return null;
  const now = new Date();
  if (periode === "week") {
    return {
      dateDebut: format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd"),
      dateFin: format(endOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd"),
    };
  }
  if (periode === "month") {
    return {
      dateDebut: format(startOfMonth(now), "yyyy-MM-dd"),
      dateFin: format(endOfMonth(now), "yyyy-MM-dd"),
    };
  }
  const next = addMonths(now, 1);
  return {
    dateDebut: format(startOfMonth(next), "yyyy-MM-dd"),
    dateFin: format(endOfMonth(next), "yyyy-MM-dd"),
  };
}

/** Plage de chargement alignée sur le filtre sélectionné (mois, semaine, tout). */
export function loadRangeForReservations(periode: PeriodeFilter): {
  dateDebut?: string;
  dateFin?: string;
} {
  return periodeToIsoRange(periode) ?? {};
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isReservationUuid(id: string): boolean {
  return UUID_RE.test(id);
}

/** Évite les faux conflits quand calendrier + infra dupliquent la même réservation. */
export function dedupeReservationsForDisplay(
  items: ReservationEnrichedV2[]
): ReservationEnrichedV2[] {
  const byKey = new Map<string, ReservationEnrichedV2>();
  for (const r of items) {
    const key = reservationMergeKey(r);
    const prev = byKey.get(key);
    if (!prev) {
      byKey.set(key, r);
      continue;
    }
    if (isReservationUuid(r.id) && !isReservationUuid(prev.id)) {
      byKey.set(key, r);
    }
  }
  return [...byKey.values()].sort((a, b) => a.date_debut.localeCompare(b.date_debut));
}

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
  const active = dedupeReservationsForDisplay(items).filter(
    (r) => normalizeStatut(r.statut) !== "annule"
  );
  const rows = active.map(reservationToConflictRow);
  return conflictIdSet(detectTerrainConflicts(rows));
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
  const myRange = getTimeRange(reservationToConflictRow(r));
  for (const o of all) {
    if (o.id === r.id || !conflictIds.has(o.id)) continue;
    if (r.stage_id && o.stage_id === r.stage_id) continue;
    if (o.infrastructure_id !== r.infrastructure_id) continue;
    if (format(parseReservationDate(o.date_debut), "yyyy-MM-dd") !== day) continue;
    const otherRange = getTimeRange(reservationToConflictRow(o));
    if (!(myRange.start < otherRange.end && myRange.end > otherRange.start)) continue;
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
