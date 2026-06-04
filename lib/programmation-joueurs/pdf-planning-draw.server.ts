import "server-only";

import type { jsPDF } from "jspdf";
import {
  addDays,
  differenceInCalendarDays,
  endOfMonth,
  endOfWeek,
  format,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { fr } from "date-fns/locale";
import type { ProgrammationEvenementEnriched } from "@/lib/types/programmation-joueurs";
import {
  LEGEND_TYPES,
  PDF_PLANNING_THEME,
  PROGRAMMATION_TYPE_SHORT,
  legendLabel,
  typeBorderRgb,
  typeColorRgb,
} from "@/lib/programmation-joueurs/pdf-planning-theme";
import { formatDateFR, formatPeriodePdf } from "@/lib/pdf/pdf-format";
import { flagForPays } from "@/lib/pdf/programmation/flagEmoji";

export type TimeColumn = {
  key: string;
  label: string;
  sub: string;
  start: Date;
  end: Date;
};

function truncate(doc: jsPDF, text: string, maxW: number): string {
  if (doc.getTextWidth(text) <= maxW) return text;
  let t = text;
  while (t.length > 1 && doc.getTextWidth(`${t}…`) > maxW) t = t.slice(0, -1);
  return `${t}…`;
}


export function buildWeekColumns(dateDebut: string, dateFin: string): TimeColumn[] {
  const start = parseISO(dateDebut.slice(0, 10));
  const end = parseISO(dateFin.slice(0, 10));
  let w = startOfWeek(start, { weekStartsOn: 1 });
  const cols: TimeColumn[] = [];
  while (w <= end) {
    const we = endOfWeek(w, { weekStartsOn: 1 });
    const clipEnd = we > end ? end : we;
    const clipStart = w < start ? start : w;
    cols.push({
      key: format(w, "yyyy-'W'ww"),
      label: `S${format(w, "w")}`,
      sub: `${format(clipStart, "d MMM", { locale: fr })}`,
      start: clipStart,
      end: clipEnd,
    });
    w = addDays(we, 1);
  }
  return cols;
}

export function buildMonthColumns(dateDebut: string, dateFin: string): TimeColumn[] {
  const start = startOfMonth(parseISO(dateDebut.slice(0, 10)));
  const end = startOfMonth(parseISO(dateFin.slice(0, 10)));
  const cols: TimeColumn[] = [];
  let cur = start;
  while (cur <= end) {
    const me = endOfMonth(cur);
    cols.push({
      key: format(cur, "yyyy-MM"),
      label: format(cur, "MMM", { locale: fr }).toUpperCase(),
      sub: format(cur, "yyyy"),
      start: cur,
      end: me,
    });
    cur = addDays(me, 1);
    cur = startOfMonth(cur);
  }
  return cols;
}

export function drawPlanningHero(
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

  doc.setFillColor(...PDF_PLANNING_THEME.heroDark);
  doc.rect(0, 0, pageW, 32, "F");
  doc.setFillColor(...PDF_PLANNING_THEME.accentRed);
  doc.rect(0, 32, pageW, 1.5, "F");
  doc.setFillColor(...PDF_PLANNING_THEME.accentGreen);
  doc.rect(0, 33.5, pageW, 0.8, "F");

  if (logo?.startsWith("data:")) {
    try {
      doc.addImage(logo, "PNG", marginLeft, 5, 22, 22);
    } catch {
      /* ignore */
    }
  }

  const tx = logo ? marginLeft + 26 : marginLeft;
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("FRMT CENTRE NATIONAL", tx, 11);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(203, 213, 225);
  doc.text("PLANNING COMPETITION & STAGES", tx, 16);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text(title.toUpperCase(), tx, 26);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(226, 232, 240);
  doc.text(subtitle, pageW - marginRight, 12, { align: "right" });
  doc.setFontSize(7);
  doc.text(`Genere ${formatDateFR(new Date().toISOString())}`, pageW - marginRight, 17, {
    align: "right",
  });
  doc.text(generatedBy, pageW - marginRight, 22, { align: "right" });
  doc.setTextColor(252, 165, 165);
  doc.text("CONFIDENTIEL", pageW - marginRight, 28, { align: "right" });

  return 38;
}

export function drawKpiStrip(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  kpis: { label: string; value: string; color: [number, number, number] }[]
): number {
  const n = kpis.length;
  const gap = 3;
  const cardW = (w - gap * (n - 1)) / n;
  const cardH = 14;

  for (let i = 0; i < n; i++) {
    const k = kpis[i]!;
    const cx = x + i * (cardW + gap);
    doc.setFillColor(...k.color);
    doc.roundedRect(cx, y, cardW, cardH, 1.5, 1.5, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text(k.value, cx + cardW / 2, y + 8, { align: "center" });
    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    doc.text(k.label.toUpperCase(), cx + cardW / 2, y + 12, { align: "center" });
  }

  return y + cardH + 4;
}

export function drawPlanningLegend(doc: jsPDF, x: number, y: number, w: number): number {
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(x, y, w, 10, 1, 1, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6);
  doc.setTextColor(...PDF_PLANNING_THEME.textDark);
  doc.text("CODE COULEUR", x + 2, y + 4);

  let cx = x + 22;
  for (const type of LEGEND_TYPES) {
    const [r, g, b] = typeColorRgb(type);
    doc.setFillColor(r, g, b);
    doc.roundedRect(cx, y + 2.5, 8, 5, 0.5, 0.5, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.5);
    doc.setTextColor(...PDF_PLANNING_THEME.muted);
    const lbl = legendLabel(type);
    doc.text(lbl, cx + 9.5, y + 6);
    cx += 9.5 + doc.getTextWidth(lbl) + 4;
    if (cx > x + w - 10) break;
  }
  return y + 12;
}

function eventSpanInColumns(
  ev: ProgrammationEvenementEnriched,
  cols: TimeColumn[],
  rangeStart: Date
): { colStart: number; colEnd: number } | null {
  const d0 = parseISO(ev.date_debut.slice(0, 10));
  const d1 = parseISO(ev.date_fin.slice(0, 10));
  let colStart = -1;
  let colEnd = -1;
  for (let i = 0; i < cols.length; i++) {
    const c = cols[i]!;
    if (d1 >= c.start && d0 <= c.end) {
      if (colStart < 0) colStart = i;
      colEnd = i;
    }
  }
  if (colStart < 0) return null;
  return { colStart, colEnd };
}

type PlanningGridOpts = {
  doc: jsPDF;
  x: number;
  y: number;
  width: number;
  labelWidth: number;
  rowHeight: number;
  cols: TimeColumn[];
  rangeStart: Date;
  rows: { id: string; label: string; sub?: string; events: ProgrammationEvenementEnriched[] }[];
};

/** Grille planning Gantt — colonnes = semaines ou mois, lignes = joueurs ou evenements */
export function drawPlanningGanttGrid(opts: PlanningGridOpts): number {
  const { doc, x, y, width, labelWidth, rowHeight, cols, rangeStart, rows } = opts;
  if (!cols.length) return y;

  const gridW = width - labelWidth;
  const colW = gridW / cols.length;
  const headerH = 10;

  // Axe temps
  doc.setFillColor(...PDF_PLANNING_THEME.axisBg);
  doc.rect(x + labelWidth, y, gridW, headerH, "F");
  doc.setFillColor(...PDF_PLANNING_THEME.textDark);
  doc.rect(x, y, labelWidth, headerH, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6);
  doc.setTextColor(255, 255, 255);
  doc.text("PLANNING", x + 2, y + 6);

  for (let i = 0; i < cols.length; i++) {
    const c = cols[i]!;
    const cx = x + labelWidth + i * colW;
    doc.setFillColor(...PDF_PLANNING_THEME.axisBg);
    doc.rect(cx, y, colW, headerH, "F");
    if (i > 0) {
      doc.setDrawColor(255, 255, 255);
      doc.setLineWidth(0.1);
      doc.line(cx, y, cx, y + headerH);
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);
    doc.text(c.label, cx + colW / 2, y + 4.5, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5);
    doc.setTextColor(203, 213, 225);
    doc.text(c.sub, cx + colW / 2, y + 8, { align: "center" });
  }

  let cy = y + headerH;

  for (let ri = 0; ri < rows.length; ri++) {
    const row = rows[ri]!;
    const rowY = cy + ri * rowHeight;

    // Label joueur / ligne
    doc.setFillColor(...(ri % 2 === 0 ? PDF_PLANNING_THEME.colBase : PDF_PLANNING_THEME.colAlt));
    doc.rect(x, rowY, labelWidth, rowHeight, "F");
    doc.setDrawColor(...PDF_PLANNING_THEME.gridLine);
    doc.setLineWidth(0.15);
    doc.rect(x, rowY, width, rowHeight);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...PDF_PLANNING_THEME.textDark);
    doc.text(truncate(doc, row.label, labelWidth - 4), x + 2, rowY + 5);
    if (row.sub) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(5.5);
      doc.setTextColor(...PDF_PLANNING_THEME.muted);
      doc.text(truncate(doc, row.sub, labelWidth - 4), x + 2, rowY + 9);
    }

    // Colonnes fond
    for (let i = 0; i < cols.length; i++) {
      const cx = x + labelWidth + i * colW;
      doc.setFillColor(...(i % 2 === 0 ? PDF_PLANNING_THEME.colBase : PDF_PLANNING_THEME.colAlt));
      doc.rect(cx, rowY, colW, rowHeight, "F");
      doc.setDrawColor(...PDF_PLANNING_THEME.gridLine);
      doc.rect(cx, rowY, colW, rowHeight);
    }

    // Barres evenements
    for (const ev of row.events) {
      const span = eventSpanInColumns(ev, cols, rangeStart);
      if (!span) continue;

      const bx = x + labelWidth + span.colStart * colW + 0.8;
      const bw = (span.colEnd - span.colStart + 1) * colW - 1.6;
      const by = rowY + 2.5;
      const bh = rowHeight - 5;

      const [r, g, b] = typeColorRgb(ev.type);
      const [br, bg, bb] = typeBorderRgb(ev.type);
      doc.setFillColor(r, g, b);
      doc.roundedRect(bx, by, bw, bh, 1, 1, "F");
      doc.setDrawColor(br, bg, bb);
      doc.setLineWidth(0.4);
      doc.roundedRect(bx, by, bw, bh, 1, 1, "S");
      // Ombre bas
      doc.setFillColor(Math.max(0, r - 30), Math.max(0, g - 30), Math.max(0, b - 30));
      doc.rect(bx, by + bh - 1, bw, 1, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(bw > 25 ? 6 : 5);
      doc.setTextColor(255, 255, 255);
      const title = `${PROGRAMMATION_TYPE_SHORT[ev.type]} · ${ev.nom}`;
      doc.text(truncate(doc, title, bw - 2), bx + 1.5, by + bh / 2 + 1);

      if (bw > 35) {
        const flag = flagForPays(ev.pays);
        const lieu = [ev.ville, flag ? `${flag} ${ev.pays}` : ev.pays].filter(Boolean).join(", ");
        if (lieu) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(4.5);
          doc.setTextColor(240, 240, 240);
          doc.text(truncate(doc, lieu, bw - 2), bx + 1.5, by + bh - 1.5);
        }
      }
    }
  }

  return cy + rows.length * rowHeight + 4;
}

/** Une ligne par evenement — vue detail planning individuel */
export function drawEventSwimlanes(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  labelWidth: number,
  cols: TimeColumn[],
  events: ProgrammationEvenementEnriched[],
  rangeStart: Date
): number {
  const sorted = [...events].sort((a, b) => a.date_debut.localeCompare(b.date_debut));
  const rows = sorted.map((ev, i) => ({
    id: ev.id,
    label: truncate(doc, ev.nom, labelWidth - 4),
    sub: formatPeriodePdf(ev.date_debut, ev.date_fin),
    events: [ev],
  }));
  if (!rows.length) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(...PDF_PLANNING_THEME.muted);
    doc.text("Aucun evenement sur la periode.", x, y + 4);
    return y + 10;
  }
  return drawPlanningGanttGrid({
    doc,
    x,
    y,
    width,
    labelWidth,
    rowHeight: 12,
    cols,
    rangeStart,
    rows,
  });
}

export function drawPlanningRecapTable(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  events: ProgrammationEvenementEnriched[],
  includeResultats?: boolean
): number {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...PDF_PLANNING_THEME.textDark);
  doc.text("SYNTHESE DES MOUVEMENTS", x, y);

  const sorted = [...events].sort((a, b) => a.date_debut.localeCompare(b.date_debut));
  let cy = y + 5;
  const rowH = 6;

  doc.setFillColor(...PDF_PLANNING_THEME.axisBg);
  doc.rect(x, cy, w, rowH, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(5.5);
  doc.setTextColor(255, 255, 255);
  const cols = ["Periode", "Evenement", "Lieu", "Type"];
  if (includeResultats) cols.push("Resultat");
  const colW = [32, 55, 40, 28, ...(includeResultats ? [25] : [])];
  let cx = x + 1;
  for (let i = 0; i < cols.length; i++) {
    doc.text(cols[i]!, cx, cy + 4);
    cx += colW[i] ?? 20;
  }
  cy += rowH;

  for (let i = 0; i < Math.min(sorted.length, 14); i++) {
    const ev = sorted[i]!;
    doc.setFillColor(...(i % 2 === 0 ? PDF_PLANNING_THEME.colBase : PDF_PLANNING_THEME.colAlt));
    doc.rect(x, cy, w, rowH, "F");
    doc.setDrawColor(...PDF_PLANNING_THEME.gridLine);
    doc.rect(x, cy, w, rowH);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.5);
    doc.setTextColor(...PDF_PLANNING_THEME.textDark);
    cx = x + 1;
    const cells = [
      formatPeriodePdf(ev.date_debut, ev.date_fin).slice(0, 28),
      ev.nom,
      [ev.ville, ev.pays].filter(Boolean).join(", ") || "—",
      PROGRAMMATION_TYPE_SHORT[ev.type],
    ];
    if (includeResultats) cells.push(ev.resultat_simple ?? "—");
    for (let j = 0; j < cells.length; j++) {
      doc.text(truncate(doc, cells[j]!, (colW[j] ?? 20) - 2), cx, cy + 4);
      cx += colW[j] ?? 20;
    }
    cy += rowH;
  }

  return cy + 2;
}

export function computeEventKpis(events: ProgrammationEvenementEnriched[]) {
  const tournois = events.filter((e) =>
    ["tournoi_itf", "tournoi_atp_wta", "coupe_davis", "bjk_cup"].includes(e.type)
  ).length;
  const stages = events.filter((e) => ["stage_national", "stage_etranger"].includes(e.type)).length;
  const pays = new Set(events.map((e) => e.pays).filter(Boolean)).size;
  let compDays = 0;
  for (const e of events) {
    if (e.type !== "repos" && e.type !== "blessure") {
      compDays +=
        differenceInCalendarDays(parseISO(e.date_fin.slice(0, 10)), parseISO(e.date_debut.slice(0, 10))) +
        1;
    }
  }
  return {
    tournois: String(tournois),
    stages: String(stages),
    semaines: String(Math.max(1, Math.round(compDays / 7))),
    pays: String(pays),
  };
}

export function drawJoueurBanner(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  name: string,
  meta?: { categorie?: string | null; classement?: string | null }
): number {
  doc.setFillColor(...PDF_PLANNING_THEME.heroMid);
  doc.roundedRect(x, y, w, 11, 1.5, 1.5, "F");
  doc.setFillColor(...PDF_PLANNING_THEME.accentGreen);
  doc.rect(x, y, 2.5, 11, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text(name.toUpperCase(), x + 5, y + 7);

  const parts: string[] = [];
  if (meta?.categorie) parts.push(meta.categorie);
  if (meta?.classement) parts.push(`Classement ${meta.classement}`);
  if (parts.length) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(203, 213, 225);
    doc.text(parts.join("  ·  "), x + w - 3, y + 7, { align: "right" });
  }

  return y + 14;
}
