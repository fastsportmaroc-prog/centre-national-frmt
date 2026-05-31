import { format, parseISO } from "date-fns";
import * as XLSX from "xlsx";
import type { ReservationEnrichedV2 } from "@/lib/types/v2";
import type { StageProgrammeV2 } from "@/lib/types/v2";
import { getCreneauInfo } from "@/lib/v2/reservations-utils";

export type CalendarEventRow = {
  date: string;
  type: string;
  nom: string;
  heure: string;
  lieu: string;
  participants: string;
};

function toIcsDate(iso: string): string {
  const d = parseISO(iso.includes("T") ? iso : `${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return "";
  return format(d, "yyyyMMdd'T'HHmmss");
}

export function buildCalendarIcs(
  stages: StageProgrammeV2[],
  reservations: ReservationEnrichedV2[]
): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//FRMT//Centre National//FR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:FRMT Centre National",
  ];

  for (const s of stages) {
    const start = `${s.date_debut.replace(/-/g, "")}T090000`;
    const end = `${s.date_fin.replace(/-/g, "")}T180000`;
    lines.push(
      "BEGIN:VEVENT",
      `UID:stage-${s.id}@frmt.ma`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:${escapeIcs(`Stage ${s.stage_action} — Centre National FRMT`)}`,
      `DESCRIPTION:${escapeIcs(`${s.categorie} · ${s.statut}`)}`,
      `LOCATION:${escapeIcs(s.lieu ?? "Centre National")}`,
      "END:VEVENT"
    );
  }

  for (const r of reservations) {
    const creneau = getCreneauInfo(r.date_debut, r.date_fin);
    const start = toIcsDate(r.date_debut);
    const end = toIcsDate(r.date_fin);
    if (!start || !end) continue;
    lines.push(
      "BEGIN:VEVENT",
      `UID:resa-${r.id}@frmt.ma`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:${escapeIcs(`Réservation ${r.court_nom ?? "Court"} — ${r.stage_nom ?? "Stage"}`)}`,
      `DESCRIPTION:${escapeIcs(`${creneau.label} ${creneau.heureDebut}-${creneau.heureFin}`)}`,
      `LOCATION:${escapeIcs(r.court_nom ?? "")}`,
      "END:VEVENT"
    );
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

function escapeIcs(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

export function downloadTextFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function buildCalendarExcelRows(
  stages: StageProgrammeV2[],
  reservations: ReservationEnrichedV2[],
  month: number,
  year: number
): CalendarEventRow[] {
  const rows: CalendarEventRow[] = [];
  const inMonth = (iso: string) => {
    const d = parseISO(iso);
    return d.getMonth() + 1 === month && d.getFullYear() === year;
  };

  for (const s of stages) {
    if (!inMonth(s.date_debut)) continue;
    rows.push({
      date: s.date_debut,
      type: "Stage",
      nom: s.stage_action,
      heure: `${s.date_debut} → ${s.date_fin}`,
      lieu: s.lieu ?? "",
      participants: `${s.nombre_joueurs ?? 0} joueurs`,
    });
  }

  for (const r of reservations) {
    if (!inMonth(r.date_debut)) continue;
    const c = getCreneauInfo(r.date_debut, r.date_fin);
    rows.push({
      date: r.date_debut.slice(0, 10),
      type: "Réservation",
      nom: `${r.court_nom ?? "Court"} — ${r.stage_nom ?? ""}`,
      heure: `${c.label} ${c.heureDebut}-${c.heureFin}`,
      lieu: r.court_nom ?? "",
      participants: r.stage_categorie ?? "",
    });
  }

  return rows.sort((a, b) => a.date.localeCompare(b.date));
}

export function downloadCalendarExcel(rows: CalendarEventRow[], month: number, year: number) {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Calendrier");
  const mois = String(month).padStart(2, "0");
  XLSX.writeFile(wb, `Calendrier_${mois}_${year}.xlsx`);
}

export function downloadCalendarIcs(stages: StageProgrammeV2[], reservations: ReservationEnrichedV2[], year: number) {
  const ics = buildCalendarIcs(stages, reservations);
  downloadTextFile(ics, `Calendrier_Stages_${year}.ics`, "text/calendar;charset=utf-8");
}
