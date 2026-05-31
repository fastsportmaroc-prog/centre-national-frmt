import { isSameDay } from "date-fns";
import type {
  DemandeBilletAvionV2,
  HebergementStageV2,
  ReservationEnrichedV2,
  RestaurationStageV2,
  StageProgrammeV2,
} from "@/lib/types/v2";
import {
  CALENDAR_TYPE_COLORS,
  categoryStyleToEventFields,
  getCalendarCategoryStyle,
} from "@/lib/v2/calendar-colors";
import {
  parseCalendarDate,
  safeEachDayInRange,
  toDateKey,
} from "@/lib/v2/calendar-dates";

export type CalendarEventType =
  | "stage"
  | "hebergement"
  | "reservation"
  | "restauration"
  | "billet";

export type CalendarEvent = {
  id: string;
  type: CalendarEventType;
  date: Date;
  label: string;
  couleur: string;
  borderColor?: string;
  textColor?: string;
  stage?: StageProgrammeV2;
  hebergement?: HebergementStageV2;
  reservation?: ReservationEnrichedV2;
  restauration?: RestaurationStageV2;
  billet?: DemandeBilletAvionV2;
};

export function getCouleurCategorie(categorie: string): string {
  return getCalendarCategoryStyle(categorie).bg;
}

export function truncateLabel(label: string, max = 20): string {
  const t = label.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

export type CalendarRawData = {
  stages: StageProgrammeV2[];
  hebergements: HebergementStageV2[];
  reservations: ReservationEnrichedV2[];
  restaurations: RestaurationStageV2[];
  billets: DemandeBilletAvionV2[];
};

export function buildCalendarEvents(data: CalendarRawData): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  const stageMap = new Map(data.stages.map((s) => [s.id, s]));

  for (const stage of data.stages) {
    const nom = stage.stage_action?.trim() || "Stage";
    const cat = stage.categorie?.trim();
    const label = cat ? `${nom} (${cat})` : nom;
    const catStyle = categoryStyleToEventFields(getCalendarCategoryStyle(stage.categorie || ""));
    for (const jour of safeEachDayInRange(stage.date_debut, stage.date_fin)) {
      events.push({
        id: `stage-${stage.id}-${toDateKey(jour)}`,
        type: "stage",
        date: jour,
        label,
        ...catStyle,
        stage,
      });
    }
  }

  for (const h of data.hebergements) {
    const stage = stageMap.get(h.stage_id);
    for (const jour of safeEachDayInRange(h.date_debut, h.date_fin)) {
      events.push({
        id: `heberg-${h.id}-${toDateKey(jour)}`,
        type: "hebergement",
        date: jour,
        label: "Hébergement",
        ...categoryStyleToEventFields(CALENDAR_TYPE_COLORS.hebergement),
        hebergement: h,
        stage,
      });
    }
  }

  for (const r of data.reservations) {
    const d = parseCalendarDate(r.date_debut);
    if (Number.isNaN(d.getTime())) continue;
    const stage = r.stage_id ? stageMap.get(r.stage_id) : undefined;
    const stageHint = r.stage_nom || stage?.stage_action;
    const court = r.court_nom || "Court";
    const label = stageHint ? `🎾 ${court} · ${stageHint}` : `🎾 ${court}`;
    events.push({
      id: `resa-${r.id}`,
      type: "reservation",
      date: d,
      label: stageHint ? `${court} · ${stageHint}` : court,
      ...categoryStyleToEventFields(CALENDAR_TYPE_COLORS.terrain),
      reservation: r,
      stage,
    });
  }

  for (const r of data.restaurations) {
    const stage = stageMap.get(r.stage_id);
    for (const jour of safeEachDayInRange(r.date_debut, r.date_fin)) {
      events.push({
        id: `restau-${r.id}-${toDateKey(jour)}`,
        type: "restauration",
        date: jour,
        label: "Restauration",
        ...categoryStyleToEventFields(CALENDAR_TYPE_COLORS.restauration),
        restauration: r,
        stage,
      });
    }
  }

  for (const b of data.billets) {
    const d = parseCalendarDate(b.date_depart);
    if (Number.isNaN(d.getTime())) continue;
    const stage = stageMap.get(b.stage_id);
    events.push({
      id: `billet-${b.id}`,
      type: "billet",
      date: d,
      label: "Billet · départ",
      ...categoryStyleToEventFields(CALENDAR_TYPE_COLORS.billet),
      billet: b,
      stage,
    });
  }

  return events;
}

export function eventsForDay(events: CalendarEvent[], day: Date): CalendarEvent[] {
  return events.filter((e) => isSameDay(e.date, day));
}

export function eventsByDayMap(events: CalendarEvent[]): Map<string, CalendarEvent[]> {
  const map = new Map<string, CalendarEvent[]>();
  for (const e of events) {
    const key = toDateKey(e.date);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(e);
  }
  return map;
}
