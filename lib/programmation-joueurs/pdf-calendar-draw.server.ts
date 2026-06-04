import "server-only";

import type { jsPDF } from "jspdf";
import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { fr } from "date-fns/locale";
import type { ProgrammationEvenementEnriched } from "@/lib/types/programmation-joueurs";
import {
  LEGEND_TYPES,
  PDF_CALENDAR_THEME,
  PROGRAMMATION_TYPE_SHORT,
  legendLabel,
  typeColorRgb,
  typeTextRgb,
} from "@/lib/programmation-joueurs/pdf-calendar-theme";
import { formatDateFR, formatPeriodePdf } from "@/lib/pdf/pdf-format";

const WEEKDAYS = ["LUN", "MAR", "MER", "JEU", "VEN", "SAM", "DIM"];

function truncate(doc: jsPDF, text: string, maxW: number): string {
  if (doc.getTextWidth(text) <= maxW) return text;
  let t = text;
  while (t.length > 1 && doc.getTextWidth(`${t}…`) > maxW) t = t.slice(0, -1);
  return `${t}…`;
}

function eventsOnDay(events: ProgrammationEvenementEnriched[], iso: string) {
  return events.filter((e) => e.date_debut.slice(0, 10) <= iso && e.date_fin.slice(0, 10) >= iso);
}

/** Bandeau pro type FFT / USTA */
export function drawCalendarProHeader(
  doc: jsPDF,
  opts: {
    pageW: number;
    marginLeft: number;
    marginRight: number;
    title: string;
    subtitle: string;
    generatedBy: string;
    logo?: string;
  }
): number {
  const { pageW, marginLeft, marginRight, title, subtitle, generatedBy, logo } = opts;
  const bandH = 28;

  doc.setFillColor(...PDF_CALENDAR_THEME.headerBg);
  doc.rect(0, 0, pageW, bandH, "F");
  doc.setFillColor(...PDF_CALENDAR_THEME.headerAccent);
  doc.rect(0, bandH, pageW, 1.2, "F");
  doc.setFillColor(...PDF_CALENDAR_THEME.headerSub);
  doc.rect(0, bandH + 1.2, pageW, 0.6, "F");

  if (logo?.startsWith("data:")) {
    try {
      doc.addImage(logo, "PNG", marginLeft, 4, 20, 20);
    } catch {
      /* ignore */
    }
  }

  const tx = logo ? marginLeft + 24 : marginLeft;
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("FRMT — CENTRE NATIONAL", tx, 10);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Programme competition & stages", tx, 15);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(title.toUpperCase(), tx, 22);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(subtitle, pageW - marginRight, 10, { align: "right" });
  doc.setFontSize(7);
  doc.text(`Genere le ${formatDateFR(new Date().toISOString())}`, pageW - marginRight, 15, {
    align: "right",
  });
  doc.text(generatedBy, pageW - marginRight, 19, { align: "right" });
  doc.setTextColor(254, 226, 226);
  doc.text("CONFIDENTIEL — usage interne", pageW - marginRight, 24, { align: "right" });

  return bandH + 6;
}

export function drawJoueurStrip(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  label: string,
  meta?: { categorie?: string | null; classement?: string | null }
): number {
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(...PDF_CALENDAR_THEME.cellBorder);
  doc.setLineWidth(0.2);
  doc.roundedRect(x, y, w, 12, 1.5, 1.5, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(label, x + 3, y + 7);

  const parts: string[] = [];
  if (meta?.categorie) parts.push(meta.categorie);
  if (meta?.classement) parts.push(`Clt. ${meta.classement}`);
  if (parts.length) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...PDF_CALENDAR_THEME.muted);
    doc.text(parts.join("  ·  "), x + 3, y + 10.5);
  }

  return y + 14;
}

export function drawColorLegend(doc: jsPDF, x: number, y: number, w: number): number {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(51, 65, 85);
  doc.text("LEGENDE", x, y);

  let cx = x;
  const rowY = y + 4;
  const gap = 2.5;

  for (const type of LEGEND_TYPES) {
    const [r, g, b] = typeColorRgb(type);
    doc.setFillColor(r, g, b);
    doc.roundedRect(cx, rowY, 4, 4, 0.5, 0.5, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    doc.setTextColor(71, 85, 105);
    const lbl = legendLabel(type);
    doc.text(lbl, cx + 5, rowY + 3);
    cx += 5 + doc.getTextWidth(lbl) + gap;
    if (cx > x + w - 20) break;
  }

  return rowY + 8;
}

type MonthGridOpts = {
  doc: jsPDF;
  x: number;
  y: number;
  width: number;
  month: Date;
  events: ProgrammationEvenementEnriched[];
  compact?: boolean;
  maxEventsPerDay?: number;
};

/** Grille mensuelle 7 colonnes — style calendrier FFT/USTA */
export function drawMonthCalendarGrid(opts: MonthGridOpts): number {
  const {
    doc,
    x,
    y,
    width,
    month,
    events,
    compact = false,
    maxEventsPerDay = compact ? 2 : 4,
  } = opts;

  const cellW = width / 7;
  const cellH = compact ? 14 : 22;
  const headerH = compact ? 5 : 6;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(compact ? 8 : 10);
  doc.setTextColor(...PDF_CALENDAR_THEME.headerBg);
  const monthLabel = format(month, "MMMM yyyy", { locale: fr });
  doc.text(monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1), x, y + 4);

  let cy = y + (compact ? 6 : 8);

  for (let i = 0; i < 7; i++) {
    const cx = x + i * cellW;
    doc.setFillColor(...PDF_CALENDAR_THEME.weekdayBg);
    doc.rect(cx, cy, cellW, headerH, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(compact ? 5.5 : 6.5);
    doc.setTextColor(255, 255, 255);
    doc.text(WEEKDAYS[i]!, cx + cellW / 2, cy + headerH - 1.5, { align: "center" });
  }
  cy += headerH;

  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const weeks: Date[][] = [];
  let wk: Date[] = [];
  for (const d of eachDayOfInterval({ start: gridStart, end: gridEnd })) {
    wk.push(d);
    if (wk.length === 7) {
      weeks.push(wk);
      wk = [];
    }
  }

  for (const week of weeks) {
    for (let col = 0; col < 7; col++) {
      const day = week[col]!;
      const cx = x + col * cellW;
      const inMonth = isSameMonth(day, month);
      const iso = format(day, "yyyy-MM-dd");
      const isWknd = col >= 5;

      if (!inMonth) doc.setFillColor(248, 250, 252);
      else if (isWknd) doc.setFillColor(...PDF_CALENDAR_THEME.weekendBg);
      else doc.setFillColor(...PDF_CALENDAR_THEME.cellBg);

      doc.setDrawColor(...PDF_CALENDAR_THEME.cellBorder);
      doc.setLineWidth(0.15);
      doc.rect(cx, cy, cellW, cellH, "FD");

      if (!inMonth) continue;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(compact ? 7 : 8);
      if (isToday(day)) doc.setTextColor(...PDF_CALENDAR_THEME.todayRing);
      else doc.setTextColor(30, 41, 59);
      doc.text(format(day, "d"), cx + cellW - 2, cy + (compact ? 4 : 5), { align: "right" });

      const dayEvents = eventsOnDay(events, iso).slice(0, maxEventsPerDay);
      let ey = cy + (compact ? 5.5 : 7);
      const barH = compact ? 3.5 : 4.5;
      const pad = 0.8;

      doc.setFontSize(compact ? 4.5 : 5.5);
      for (const ev of dayEvents) {
        const [r, g, b] = typeColorRgb(ev.type);
        const [tr, tg, tb] = typeTextRgb(ev.type);
        doc.setFillColor(r, g, b);
        doc.roundedRect(cx + pad, ey, cellW - pad * 2, barH, 0.4, 0.4, "F");
        doc.setTextColor(tr);
        doc.setFont("helvetica", "bold");
        const line = truncate(doc, `${PROGRAMMATION_TYPE_SHORT[ev.type]} ${ev.nom}`, cellW - pad * 2 - 1);
        doc.text(line, cx + pad + 0.5, ey + barH - 1);
        ey += barH + 0.6;
      }

      const extra = eventsOnDay(events, iso).length - maxEventsPerDay;
      if (extra > 0) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(4.5);
        doc.setTextColor(...PDF_CALENDAR_THEME.muted);
        doc.text(`+${extra}`, cx + pad, ey + 2);
      }
    }
    cy += cellH;
  }

  return cy + 4;
}

export function drawEventsAgenda(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  events: ProgrammationEvenementEnriched[],
  includeResultats?: boolean
): number {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text("DETAIL DES EVENEMENTS", x, y);

  let cy = y + 5;
  const sorted = [...events].sort((a, b) => a.date_debut.localeCompare(b.date_debut));

  for (const ev of sorted.slice(0, 10)) {
    const [r, g, b] = typeColorRgb(ev.type);
    doc.setFillColor(r, g, b);
    doc.circle(x + 2, cy + 1.5, 1.2, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(15, 23, 42);
    const lieu = [ev.ville, ev.pays].filter(Boolean).join(", ");
    doc.text(truncate(doc, `${formatPeriodePdf(ev.date_debut, ev.date_fin)}  —  ${ev.nom}`, w - 4), x + 5, cy + 2);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    doc.setTextColor(...PDF_CALENDAR_THEME.muted);
    const line2 = [lieu, ev.categorie_tournoi, includeResultats ? ev.resultat_simple : null]
      .filter(Boolean)
      .join("  ·  ");
    if (line2) doc.text(truncate(doc, line2, w - 4), x + 5, cy + 5);

    cy += 8;
  }

  return cy;
}

export function monthsInRange(dateDebut: string, dateFin: string): Date[] {
  const start = startOfMonth(parseISO(dateDebut.slice(0, 10)));
  const end = startOfMonth(parseISO(dateFin.slice(0, 10)));
  const months: Date[] = [];
  let cur = start;
  while (cur <= end) {
    months.push(cur);
    cur = startOfMonth(addDays(endOfMonth(cur), 1));
  }
  return months;
}
