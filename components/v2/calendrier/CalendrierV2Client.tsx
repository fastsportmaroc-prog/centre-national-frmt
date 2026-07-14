"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarDays, ChevronLeft, ChevronRight, Download, Rss } from "lucide-react";
import { V2PageHeader } from "@/components/v2/V2PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import {
  buildCalendarExcelRows,
  downloadCalendarExcel,
  downloadCalendarIcs,
} from "@/lib/v2/calendar-exports";
import {
  buildCalendarEvents,
  eventsByDayMap,
  eventsForDay,
  truncateLabel,
  type CalendarEvent,
  type CalendarRawData,
} from "@/lib/v2/calendar-events";
import { loadCalendarMonthData } from "@/lib/v2/calendar-load";
import { parseCalendarDate, toDateKey } from "@/lib/v2/calendar-dates";
import { exportCalendrierPDF } from "@/lib/pdf/pdf-exports";
import { deleteStage, getJoueursByStage, getEntraineursByStage } from "@/lib/supabase/queries";
import type { ReservationEnrichedV2, StageProgrammeV2 } from "@/lib/types/v2";
import {
  formatDateLong,
  formatTime,
  getCreneauGridSlot,
  getCreneauInfo,
} from "@/lib/v2/reservations-utils";
import { useRole } from "@/lib/hooks/useRole";
import { useUserPermissions } from "@/lib/hooks/useUserPermissions";
import { useToast } from "@/components/v2/ui/ToastProvider";
import { filterCalendarRawData } from "@/lib/v2/calendar-category-filter";
import { useSupabaseTableRefresh } from "@/lib/hooks/use-supabase-table-refresh";
import {
  CALENDAR_CATEGORY_LEGEND,
  CALENDAR_TYPE_COLORS,
  CALENDAR_TYPE_LEGEND,
} from "@/lib/v2/calendar-colors";
import { CalendarLegendChip } from "@/components/v2/calendrier/CalendarLegendChip";

type ViewMode = "year" | "month" | "week" | "day";

const GRID_START_HOUR = 7;
const GRID_END_HOUR = 20;
const GRID_HEIGHT_PX = 520;

const RESA_STYLE = CALENDAR_TYPE_COLORS.terrain;
const MAX_VISIBLE_EVENTS = 3;

type DetailState =
  | { kind: "stage"; stage: StageProgrammeV2; joueurs: string[]; coachs: string[] }
  | { kind: "reservation"; reservation: ReservationEnrichedV2 }
  | { kind: "event"; event: CalendarEvent };

function stageSpansDay(stage: StageProgrammeV2, day: Date): boolean {
  const start = parseCalendarDate(stage.date_debut);
  const end = parseCalendarDate(stage.date_fin);
  if (Number.isNaN(start.getTime())) return false;
  const endD = Number.isNaN(end.getTime()) ? start : end;
  return eachDayOfInterval({ start, end: endD }).some((d) => isSameDay(d, day));
}

function EventChip({
  event,
  onClick,
}: {
  event: CalendarEvent;
  onClick: () => void;
}) {
  const textColor = event.textColor ?? "#ffffff";
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded border px-1.5 py-0.5 text-left text-[11px] font-semibold leading-snug shadow-sm transition hover:brightness-110"
      style={{
        backgroundColor: event.couleur,
        borderColor: event.borderColor ?? event.couleur,
        color: textColor,
        textShadow: "0 1px 2px rgba(0,0,0,0.65)",
      }}
      title={event.label}
    >
      {truncateLabel(event.label, 22)}
    </button>
  );
}

const EMPTY_RAW: CalendarRawData = {
  stages: [],
  hebergements: [],
  reservations: [],
  restaurations: [],
  billets: [],
};

export function CalendrierV2Client() {
  const { canDelete } = useRole();
  const { categoryContext } = useUserPermissions();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const stageFromUrl = searchParams.get("stage") ?? "";
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const [view, setView] = useState<ViewMode>("month");
  const [raw, setRaw] = useState(EMPTY_RAW);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [expandedDayKey, setExpandedDayKey] = useState<string | null>(null);
  const [detail, setDetail] = useState<DetailState | null>(null);
  const [stageFilter, setStageFilter] = useState(stageFromUrl);
  const [showTerrain, setShowTerrain] = useState(false);
  const [showHebergement, setShowHebergement] = useState(false);
  const [showRestauration, setShowRestauration] = useState(false);
  const [showBillet, setShowBillet] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await loadCalendarMonthData(cursor, view);
    const scoped = filterCalendarRawData(
      {
        stages: result.stages,
        hebergements: result.hebergements,
        reservations: result.reservations,
        restaurations: result.restaurations,
        billets: result.billets,
      },
      categoryContext
    );
    setRaw(scoped);
    setLoadError(result.loadError);
    setLoading(false);
  }, [cursor, view, categoryContext]);

  useEffect(() => {
    void load();
  }, [load]);

  useSupabaseTableRefresh(
    ["planning", "reservations_infrastructure", "stages_programme"],
    () => {
      void load();
    }
  );

  useEffect(() => {
    setStageFilter(stageFromUrl);
  }, [stageFromUrl]);

  const { stages, reservations, hebergements, restaurations, billets } = raw;

  const stageOptions = useMemo(
    () =>
      [...raw.stages]
        .sort((a, b) => a.date_debut.localeCompare(b.date_debut))
        .map((s) => ({ id: s.id, label: s.stage_action })),
    [raw.stages]
  );

  const filteredRaw = useMemo(() => {
    if (!stageFilter) return raw;
    return {
      stages: raw.stages.filter((s) => s.id === stageFilter),
      hebergements: raw.hebergements.filter((h) => h.stage_id === stageFilter),
      reservations: raw.reservations.filter((r) => r.stage_id === stageFilter),
      restaurations: raw.restaurations.filter((r) => r.stage_id === stageFilter),
      billets: raw.billets.filter((b) => b.stage_id === stageFilter),
    };
  }, [raw, stageFilter]);

  useEffect(() => {
    if (!stageFilter) return;
    const target = raw.stages.find((s) => s.id === stageFilter);
    if (!target) return;
    const start = parseCalendarDate(target.date_debut);
    if (Number.isNaN(start.getTime())) return;
    setCursor(startOfMonth(start));
    if (view === "week") setCursor(startOfWeek(start, { weekStartsOn: 1 }));
    if (view === "day") setCursor(startOfDay(start));
  }, [stageFilter, raw.stages, view]);

  const calendarEvents = useMemo(() => buildCalendarEvents(filteredRaw), [filteredRaw]);
  const visibleEvents = useMemo(
    () =>
      calendarEvents.filter((e) => {
        if (e.type === "stage") return true;
        if (e.type === "reservation") return showTerrain;
        if (e.type === "hebergement") return showHebergement;
        if (e.type === "restauration") return showRestauration;
        if (e.type === "billet") return showBillet;
        return true;
      }),
    [calendarEvents, showTerrain, showHebergement, showRestauration, showBillet]
  );
  const dayEventMap = useMemo(() => eventsByDayMap(visibleEvents), [visibleEvents]);

  const monthStart = startOfMonth(cursor);
  const year = cursor.getFullYear();

  const monthEventCount = useMemo(() => {
    if (view !== "month") return visibleEvents.length;
    return visibleEvents.filter((e) => isSameMonth(e.date, cursor)).length;
  }, [visibleEvents, cursor, view]);

  const hebergementStageIds = useMemo(
    () => new Set(hebergements.map((h) => h.stage_id)),
    [hebergements]
  );
  const restaurationStageIds = useMemo(
    () => new Set(restaurations.map((r) => r.stage_id)),
    [restaurations]
  );
  const billetStageIds = useMemo(() => new Set(billets.map((b) => b.stage_id)), [billets]);

  async function openCalendarEvent(ev: CalendarEvent) {
    if (ev.type === "stage" && ev.stage) {
      await openStage(ev.stage);
      return;
    }
    if (ev.type === "reservation" && ev.reservation) {
      setDetail({ kind: "reservation", reservation: ev.reservation });
      return;
    }
    setDetail({ kind: "event", event: ev });
  }

  function navigatePrev() {
    if (view === "year") setCursor((c) => addYears(c, -1));
    else if (view === "month") setCursor((c) => addMonths(c, -1));
    else if (view === "week") setCursor((c) => addWeeks(c, -1));
    else setCursor((c) => addDays(c, -1));
  }

  function navigateNext() {
    if (view === "year") setCursor((c) => addYears(c, 1));
    else if (view === "month") setCursor((c) => addMonths(c, 1));
    else if (view === "week") setCursor((c) => addWeeks(c, 1));
    else setCursor((c) => addDays(c, 1));
  }

  function goToday() {
    const now = new Date();
    if (view === "year") setCursor(startOfMonth(now));
    else if (view === "month") setCursor(startOfMonth(now));
    else if (view === "week") setCursor(startOfWeek(now, { weekStartsOn: 1 }));
    else setCursor(startOfDay(now));
  }

  async function openStage(s: StageProgrammeV2) {
    const [j, e] = await Promise.all([getJoueursByStage(s.id), getEntraineursByStage(s.id)]);
    setDetail({
      kind: "stage",
      stage: s,
      joueurs: j.map((x) => `${x.prenom} ${x.nom}`),
      coachs: e.map((x) => `${x.prenom} ${x.nom}`),
    });
  }

  async function handleDeleteStageFromModal(stage: StageProgrammeV2) {
    const ok = confirm(
      `Supprimer le stage « ${stage.stage_action} » ?\n\nToutes les données liées seront supprimées (hébergement, restauration, planning, réservations, billets).`
    );
    if (!ok) return;
    const res = await deleteStage(stage.id);
    if (!res.ok) {
      toast(res.error ?? "Suppression impossible", "error");
      return;
    }
    toast("Stage supprimé");
    setDetail(null);
    await load();
  }

  function exportPdf() {
    const mois = cursor.getMonth() + 1;
    const annee = cursor.getFullYear();
    const exportStages = raw.stages;
    const exportResa = raw.reservations;
    const monthStages = exportStages.filter((s) =>
      isSameMonth(parseCalendarDate(s.date_debut), cursor)
    );
    const monthResa = exportResa.filter((r) => {
      const d = parseCalendarDate(r.date_debut);
      return d.getMonth() + 1 === mois && d.getFullYear() === annee;
    });
    exportCalendrierPDF(monthStages, mois, annee, monthResa);
  }

  function exportExcel() {
    const mois = cursor.getMonth() + 1;
    const annee = cursor.getFullYear();
    const rows = buildCalendarExcelRows(raw.stages, raw.reservations, mois, annee);
    downloadCalendarExcel(rows, mois, annee);
  }

  function exportIcs() {
    downloadCalendarIcs(raw.stages, raw.reservations, year);
  }

  const headerLabel = useMemo(() => {
    if (view === "year") return String(year);
    if (view === "month") return format(cursor, "MMMM yyyy", { locale: fr });
    if (view === "week") {
      const ws = startOfWeek(cursor, { weekStartsOn: 1 });
      const we = endOfWeek(cursor, { weekStartsOn: 1 });
      return `${format(ws, "d MMM", { locale: fr })} – ${format(we, "d MMM yyyy", { locale: fr })}`;
    }
    return format(cursor, "EEEE d MMMM yyyy", { locale: fr });
  }, [view, cursor, year]);

  const monthGridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const monthGridEnd = endOfWeek(endOfMonth(monthStart), { weekStartsOn: 1 });
  const monthDays = eachDayOfInterval({ start: monthGridStart, end: monthGridEnd });

  const weekDays = useMemo(() => {
    const ws = startOfWeek(cursor, { weekStartsOn: 1 });
    const we = endOfWeek(cursor, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: ws, end: we });
  }, [cursor]);

  const dayReservations = useMemo(
    () => eventsForDay(visibleEvents, cursor).filter((e) => e.type === "reservation"),
    [visibleEvents, cursor]
  );

  const hourLabels = useMemo(() => {
    const labels: number[] = [];
    for (let h = GRID_START_HOUR; h <= GRID_END_HOUR; h++) labels.push(h);
    return labels;
  }, []);

  function topPx(hour: number): number {
    const span = GRID_END_HOUR - GRID_START_HOUR;
    return ((hour - GRID_START_HOUR) / span) * GRID_HEIGHT_PX;
  }

  function heightPx(startHour: number, endHour: number): number {
    const span = GRID_END_HOUR - GRID_START_HOUR;
    return Math.max(18, ((endHour - startHour) / span) * GRID_HEIGHT_PX);
  }

  function renderTimeGrid(days: Date[]) {
    return (
      <div className="flex gap-2 overflow-x-auto">
        <div className="w-12 shrink-0 pt-8">
          {hourLabels.map((h) => (
            <div
              key={h}
              className="text-[10px] font-medium text-[#8b949e]"
              style={{ height: `${GRID_HEIGHT_PX / hourLabels.length}px` }}
            >
              {String(h).padStart(2, "0")}:00
            </div>
          ))}
        </div>
        <div className="flex flex-1 gap-1 min-w-0">
          {days.map((day) => {
            const key = format(day, "yyyy-MM-dd");
            const dayEv = eventsForDay(visibleEvents, day);
            const dayResa = dayEv.filter((e) => e.type === "reservation");
            const dayStages = dayEv.filter((e) => e.type === "stage" && e.stage);
            return (
              <div key={key} className="min-w-[100px] flex-1">
                <div
                  className={`mb-1 text-center text-xs font-semibold capitalize ${
                    isToday(day) ? "text-frmt-gold" : "text-[#e6edf3]"
                  }`}
                >
                  {format(day, "EEE d", { locale: fr })}
                </div>
                <div
                  className="relative rounded border border-[#30363d] bg-[#161b22]"
                  style={{ height: GRID_HEIGHT_PX }}
                >
                  {hourLabels.map((h) => (
                    <div
                      key={h}
                      className="absolute left-0 right-0 border-t border-border/40"
                      style={{ top: topPx(h) }}
                    />
                  ))}
                  {dayStages.map((ev) => {
                    const s = ev.stage!;
                    return (
                      <button
                        key={ev.id}
                        type="button"
                        onClick={() => void openCalendarEvent(ev)}
                        className="absolute left-0.5 right-0.5 z-10 overflow-hidden rounded border px-1 py-0.5 text-left text-[10px] font-semibold leading-tight"
                        style={{
                          top: topPx(9),
                          height: heightPx(9, 13),
                          backgroundColor: ev.couleur,
                          borderColor: ev.borderColor ?? ev.couleur,
                          color: ev.textColor ?? "#fff",
                          textShadow: "0 1px 2px rgba(0,0,0,0.65)",
                        }}
                        title={s.stage_action}
                      >
                        <span className="line-clamp-2 font-medium">{s.stage_action}</span>
                      </button>
                    );
                  })}
                  {dayResa.map((ev) => {
                    const r = ev.reservation!;
                    const slot = getCreneauGridSlot(r.date_debut, r.date_fin);
                    const creneau = getCreneauInfo(r.date_debut, r.date_fin);
                    return (
                      <button
                        key={ev.id}
                        type="button"
                        onClick={() => void openCalendarEvent(ev)}
                        className="absolute left-0.5 right-0.5 z-20 overflow-hidden rounded border px-1 py-0.5 text-left text-[10px] font-semibold"
                        style={{
                          top: topPx(slot.startHour),
                          height: heightPx(slot.startHour, slot.endHour),
                          backgroundColor: RESA_STYLE.bg,
                          borderColor: RESA_STYLE.border,
                          color: RESA_STYLE.text,
                          textShadow: "0 1px 2px rgba(0,0,0,0.65)",
                        }}
                        title={`${r.court_nom} — ${creneau.label}`}
                      >
                        <span className="line-clamp-2 font-medium">
                          {r.court_nom ?? "Court"} · {creneau.label}
                        </span>
                        <span className="opacity-90">
                          {slot.startHour}:00-{slot.endHour}:00
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <>
      <V2PageHeader
        title="Calendrier"
        description={
          loading ?
            "Chargement…"
          : stageFilter && stageOptions.find((s) => s.id === stageFilter) ?
            `Stage : ${stageOptions.find((s) => s.id === stageFilter)?.label} · lié au planning`
          : `${raw.stages.length} stage(s) connecté(s) · planning & calendrier synchronisés`
        }
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/v2/stages">
              <Button variant="secondary" size="sm">
                + Stage
              </Button>
            </Link>
            <Button variant="secondary" size="sm" onClick={() => void load()}>
              Actualiser
            </Button>
            <Button variant="secondary" size="sm" onClick={goToday}>
              Aujourd&apos;hui
            </Button>
            <Button variant="secondary" size="sm" onClick={exportIcs}>
              <Rss className="h-4 w-4" />
              S&apos;abonner iCal
            </Button>
            <Button variant="secondary" size="sm" onClick={exportPdf}>
              <Download className="h-4 w-4" />
              Exporter PDF
            </Button>
            <Button variant="secondary" size="sm" onClick={exportExcel}>
              <Download className="h-4 w-4" />
              Exporter Excel
            </Button>
          </div>
        }
      />
      <main className="space-y-4 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={navigatePrev} aria-label="Précédent">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="min-w-[10rem] text-center text-lg font-semibold capitalize">
              {headerLabel}
            </h2>
            <Button variant="ghost" size="sm" onClick={navigateNext} aria-label="Suivant">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex gap-1 rounded-lg border border-border p-1">
            {(
              [
                ["year", "Année"],
                ["month", "Mois"],
                ["week", "Semaine"],
                ["day", "Jour"],
              ] as const
            ).map(([v, label]) => (
              <button
                key={v}
                type="button"
                onClick={() => {
                  setView(v);
                  if (v === "week") setCursor(startOfWeek(cursor, { weekStartsOn: 1 }));
                  if (v === "day") setCursor(startOfDay(cursor));
                  if (v === "month") setCursor(startOfMonth(cursor));
                }}
                className={`rounded px-3 py-1 text-xs ${
                  view === v ? "bg-frmt-green text-white" : "text-muted hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <Card className="flex flex-wrap items-center gap-3 p-3">
          <div className="flex min-w-[200px] flex-col gap-1">
            <span className="text-xs text-muted">Stage</span>
            <Select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              className="max-w-xs"
            >
              <option value="">Tous les stages ({raw.stages.length})</option>
              {stageOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </Select>
          </div>
          {stageFilter && (
            <>
              <Link
                href={`/v2/stages/${stageFilter}`}
                className="self-end text-sm text-frmt-green underline-offset-2 hover:underline"
              >
                Fiche stage →
              </Link>
              <Link
                href={`/v2/planning?stage=${stageFilter}`}
                className="self-end text-sm text-[#3498db] underline-offset-2 hover:underline"
              >
                Planning →
              </Link>
            </>
          )}
        </Card>

        <Card className="p-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-[#c9d1d9]">Afficher aussi :</span>
            <button
              type="button"
              onClick={() => setShowTerrain((v) => !v)}
              className={`rounded px-3 py-1 text-xs ${
                showTerrain ? "border border-violet-400 bg-violet-700 text-white" : "border border-[#484f58] bg-[#21262d] text-[#c9d1d9]"
              }`}
            >
              Terrain
            </button>
            <button
              type="button"
              onClick={() => setShowHebergement((v) => !v)}
              className={`rounded px-3 py-1 text-xs ${
                showHebergement ? "border border-blue-400 bg-blue-800 text-white" : "border border-[#484f58] bg-[#21262d] text-[#c9d1d9]"
              }`}
            >
              Hébergement
            </button>
            <button
              type="button"
              onClick={() => setShowRestauration((v) => !v)}
              className={`rounded px-3 py-1 text-xs ${
                showRestauration ? "border border-orange-400 bg-orange-800 text-white" : "border border-[#484f58] bg-[#21262d] text-[#c9d1d9]"
              }`}
            >
              Restauration
            </button>
            <button
              type="button"
              onClick={() => setShowBillet((v) => !v)}
              className={`rounded px-3 py-1 text-xs ${
                showBillet ? "border border-pink-400 bg-pink-900 text-white" : "border border-[#484f58] bg-[#21262d] text-[#c9d1d9]"
              }`}
            >
              Billet
            </button>
          </div>
        </Card>

        {view === "year" && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 12 }, (_, i) => {
              const m = new Date(year, i, 1);
              const mStart = startOfMonth(m);
              const gStart = startOfWeek(mStart, { weekStartsOn: 1 });
              const gEnd = endOfWeek(endOfMonth(mStart), { weekStartsOn: 1 });
              const miniDays = eachDayOfInterval({ start: gStart, end: gEnd });
              const stageCount = visibleEvents.filter(
                (e) => e.type === "stage" && isSameMonth(e.date, m)
              ).length;
              const resaCount = visibleEvents.filter(
                (e) => e.type === "reservation" && isSameMonth(e.date, m)
              ).length;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setCursor(mStart);
                    setView("month");
                  }}
                  className="rounded-lg border border-border bg-surface p-2 text-left hover:border-frmt-green/50"
                >
                  <p className="mb-1 text-sm font-semibold capitalize">
                    {format(m, "MMMM", { locale: fr })}
                  </p>
                  <div className="grid grid-cols-7 gap-px text-[8px] text-muted">
                    {["L", "M", "M", "J", "V", "S", "D"].map((d, di) => (
                      <span key={`${i}-${di}`} className="text-center">
                        {d}
                      </span>
                    ))}
                    {miniDays.map((day) => {
                      const key = format(day, "yyyy-MM-dd");
                      const dayEv = dayEventMap.get(key) ?? [];
                      const hasStage = dayEv.some((e) => e.type === "stage");
                      const hasResa = dayEv.some((e) => e.type === "reservation");
                      return (
                        <span
                          key={key}
                          className={`text-center ${
                            !isSameMonth(day, m) ? "opacity-30" : ""
                          } ${hasStage ? "font-bold text-frmt-green" : ""} ${
                            hasResa ? "underline decoration-violet-500" : ""
                          }`}
                        >
                          {format(day, "d")}
                        </span>
                      );
                    })}
                  </div>
                  <p className="mt-1 text-[10px] text-muted">
                    {stageCount} stage{stageCount !== 1 ? "s" : ""} · {resaCount} résa.
                  </p>
                </button>
              );
            })}
          </div>
        )}

        {loading && (
          <p className="text-center text-sm text-muted">Chargement du calendrier…</p>
        )}

        {loadError && (
          <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
            Avertissement chargement : {loadError}. Affichage des données disponibles en secours.
          </p>
        )}

        {view === "month" && !loading && monthEventCount === 0 && (
          <Card className="border-dashed p-8 text-center">
            <p className="text-sm text-muted">
              {stageFilter ?
                "Aucun événement pour ce stage sur ce mois."
              : "Aucun stage sur ce mois. Créez un stage pour l’afficher ici et dans le planning."}
            </p>
            <Link
              href={stageFilter ? `/v2/stages/${stageFilter}` : "/v2/stages"}
              className="mt-3 inline-block text-sm font-medium text-frmt-green hover:underline"
            >
              {stageFilter ? "Ouvrir la fiche stage →" : "+ Créer un stage →"}
            </Link>
          </Card>
        )}

        {view === "month" && (
          <Card className="overflow-hidden p-2 shadow-md">
            <div className="grid grid-cols-7 gap-px bg-[#30363d] text-center text-xs font-semibold text-[#c9d1d9]">
              {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d) => (
                <div key={d} className="bg-[#21262d] py-2">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-px bg-[#30363d]">
              {monthDays.map((day) => {
                const key = toDateKey(day);
                const dayEv = dayEventMap.get(key) ?? [];
                const expanded = expandedDayKey === key;
                const visible = expanded ? dayEv : dayEv.slice(0, MAX_VISIBLE_EVENTS);
                const hidden = dayEv.length - visible.length;
                const inMonth = isSameMonth(day, cursor);
                return (
                  <div
                    key={key}
                    className={`min-h-[108px] bg-[#161b22] p-1.5 ${!inMonth ? "opacity-45" : ""} ${
                      isToday(day) ? "ring-2 ring-inset ring-frmt-gold/60" : ""
                    }`}
                  >
                    <span className="text-xs font-bold text-[#e6edf3]">{format(day, "d")}</span>
                    <div className="mt-0.5 space-y-0.5">
                      {visible.map((ev) => (
                        <EventChip
                          key={ev.id}
                          event={ev}
                          onClick={() => void openCalendarEvent(ev)}
                        />
                      ))}
                      {hidden > 0 && (
                        <button
                          type="button"
                          className="text-[10px] font-semibold text-frmt-gold hover:underline"
                          onClick={() => setExpandedDayKey(expanded ? null : key)}
                        >
                          {expanded ? "Réduire" : `+${hidden} autre${hidden > 1 ? "s" : ""}`}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {view === "week" && <Card className="overflow-x-auto p-3">{renderTimeGrid(weekDays)}</Card>}

        {view === "day" && (
          <Card className="overflow-x-auto p-3">
            {renderTimeGrid([startOfDay(cursor)])}
            {dayReservations.length === 0 && (
              <p className="mt-2 text-center text-sm text-muted">Aucune réservation ce jour.</p>
            )}
          </Card>
        )}

        <Card className="border-[#30363d] bg-[#161b22] p-4">
          <h3 className="mb-3 text-sm font-semibold text-[#e6edf3]">Légende</h3>
          <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-[#8b949e]">
            Catégories stage
          </p>
          <div className="flex flex-wrap gap-2">
            {CALENDAR_CATEGORY_LEGEND.map((item) => (
              <CalendarLegendChip key={item.label} {...item} />
            ))}
          </div>
          <p className="mb-2 mt-4 text-[10px] font-medium uppercase tracking-wide text-[#8b949e]">
            Logistique
          </p>
          <div className="flex flex-wrap gap-2">
            {CALENDAR_TYPE_LEGEND.map((item) => (
              <CalendarLegendChip key={item.label} {...item} />
            ))}
          </div>
        </Card>
      </main>

      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title={
          detail?.kind === "stage"
            ? detail.stage.stage_action
            : detail?.kind === "reservation"
              ? `Réservation — ${detail.reservation.court_nom ?? "Court"}`
              : detail?.kind === "event"
                ? detail.event.label
                : ""
        }
      >
        {detail?.kind === "stage" && (
          <div className="space-y-3 text-sm">
            <p>
              <CalendarDays className="mr-1 inline h-4 w-4" />
              {formatDateLong(detail.stage.date_debut)} → {formatDateLong(detail.stage.date_fin)}
            </p>
            <p>
              {detail.stage.categorie} · {detail.stage.statut} · {detail.stage.lieu ?? "—"}
            </p>
            <p>
              <strong>Joueurs ({detail.joueurs.length}) :</strong>{" "}
              {detail.joueurs.join(", ") || "—"}
            </p>
            <p>
              <strong>Entraîneurs ({detail.coachs.length}) :</strong>{" "}
              {detail.coachs.join(", ") || "—"}
            </p>
            <p className="flex flex-wrap gap-3">
              <span>
                Hébergement {hebergementStageIds.has(detail.stage.id) ? "✓" : "✗"}
              </span>
              <span>
                Restauration {restaurationStageIds.has(detail.stage.id) ? "✓" : "✗"}
              </span>
              <span>Billet {billetStageIds.has(detail.stage.id) ? "✓" : "✗"}</span>
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href={`/v2/stages/${detail.stage.id}`}
                className="inline-flex items-center text-frmt-green hover:underline"
              >
                Voir la fiche stage →
              </Link>
              <Link
                href={`/v2/planning?stage=${detail.stage.id}`}
                className="inline-flex items-center text-[#3498db] hover:underline"
              >
                Planning →
              </Link>
            </div>
            {canDelete && (
              <div>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => void handleDeleteStageFromModal(detail.stage)}
                >
                  Supprimer ce stage
                </Button>
              </div>
            )}
          </div>
        )}
        {detail?.kind === "event" && (
          <div className="space-y-3 text-sm">
            <p className="font-medium">{detail.event.label}</p>
            <p>{formatDateLong(toDateKey(detail.event.date))}</p>
            {detail.event.stage && (
              <>
                <p>
                  Stage : {detail.event.stage.stage_action} ({detail.event.stage.categorie})
                </p>
                <Link
                  href={`/v2/stages/${detail.event.stage.id}`}
                  className="inline-flex text-frmt-green hover:underline"
                >
                  Voir la fiche stage →
                </Link>
              </>
            )}
          </div>
        )}
        {detail?.kind === "reservation" && (
          <div className="space-y-3 text-sm">
            {(() => {
              const r = detail.reservation;
              const c = getCreneauInfo(r.date_debut, r.date_fin);
              return (
                <>
                  <p>{formatDateLong(r.date_debut)}</p>
                  <p>
                    {c.emoji} {c.label} · {formatTime(r.date_debut)} → {formatTime(r.date_fin)}
                  </p>
                  <p>
                    <strong>Court :</strong> {r.court_nom ?? "—"}
                    {r.court_surface ? ` (${r.court_surface})` : ""}
                  </p>
                  <p>
                    <strong>Stage :</strong> {r.stage_nom ?? "—"}{" "}
                    {r.stage_categorie ? `(${r.stage_categorie})` : ""}
                  </p>
                  <p>
                    <strong>Coach :</strong>{" "}
                    {[r.coach_prenom, r.coach_nom].filter(Boolean).join(" ") || "—"}
                  </p>
                  {r.stage_id && (
                    <>
                      <Link
                        href={`/v2/stages/${r.stage_id}`}
                        className="inline-flex items-center text-frmt-green hover:underline"
                      >
                        Voir la fiche stage →
                      </Link>
                      <Link
                        href={`/v2/planning?stage=${r.stage_id}`}
                        className="ml-3 inline-flex items-center text-frmt-green hover:underline"
                      >
                        Planning →
                      </Link>
                    </>
                  )}
                </>
              );
            })()}
          </div>
        )}
      </Modal>
    </>
  );
}
