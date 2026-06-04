import "server-only";

import type { jsPDF } from "jspdf";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import type { ProgrammationEvenementEnriched, ProgrammationStatut } from "@/lib/types/programmation-joueurs";
import { PROGRAMMATION_TYPE_LABELS } from "@/lib/constants/programmation-joueurs";
import { PROGRAMMATION_TYPE_SHORT } from "@/lib/programmation-joueurs/pdf-planning-theme";
import {
  buildMonthColumns,
  buildWeekColumns,
  drawPlanningGanttGrid,
  type TimeColumn,
} from "@/lib/programmation-joueurs/pdf-planning-draw.server";
import { formatDateFR, formatPeriodePdf } from "@/lib/pdf/pdf-format";
import { PDF_META } from "@/lib/pdf/pdfDesignSystem";
import { PDF_PRO, TYPE_PDF_RGB, LEGEND_ORDER } from "@/lib/pdf/programmation/couleurs";
import { truncateText } from "@/lib/pdf/programmation/formatters";
import type { JoueurPdfRow } from "@/lib/pdf/programmation/types";

export const PRO_MARGINS = { left: 10, right: 10, top: 24, bottom: 12 };
export const PRO_HEADER_H = 22;
export const PRO_FOOTER_H = 8;

export function drawProHeader(
  doc: jsPDF,
  opts: {
    pageW: number;
    title: string;
    subtitle: string;
    generatedBy: string;
    logo?: string;
  }
): number {
  const { pageW, title, subtitle, generatedBy, logo } = opts;
  const ml = PRO_MARGINS.left;

  doc.setFillColor(...PDF_PRO.headerBg);
  doc.rect(0, 0, pageW, PRO_HEADER_H, "F");

  if (logo?.startsWith("data:")) {
    try {
      doc.addImage(logo, "PNG", ml, 3, 16, 16);
    } catch {
      /* ignore */
    }
  }

  const tx = logo ? ml + 18 : ml;
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("FRMT CENTRE NATIONAL", tx, 8);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.setTextColor(203, 213, 225);
  doc.text("PROGRAMMATION JOUEURS", tx, 12);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text(title, pageW / 2, 10, { align: "center" });

  const mr = PRO_MARGINS.right;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(226, 232, 240);
  doc.text(subtitle, pageW - mr, 6, { align: "right" });
  doc.setFontSize(6);
  doc.text(`Généré ${formatDateFR(new Date().toISOString())}`, pageW - mr, 10, { align: "right" });
  doc.text(generatedBy, pageW - mr, 14, { align: "right" });
  doc.setTextColor(248, 113, 113);
  doc.setFont("helvetica", "bold");
  doc.text("CONFIDENTIEL", pageW - mr, 18, { align: "right" });

  const gradY = PRO_HEADER_H;
  const half = pageW / 2;
  doc.setFillColor(...PDF_PRO.headerLine1);
  doc.rect(0, gradY, half, 0.8, "F");
  doc.setFillColor(...PDF_PRO.headerLine2);
  doc.rect(half, gradY, half, 0.8, "F");

  return PRO_HEADER_H + 2;
}

export function drawProFooter(doc: jsPDF) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const total = doc.getNumberOfPages();
  const genDate = formatDateFR(new Date().toISOString());

  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    const fy = pageH - PRO_FOOTER_H;
    doc.setFillColor(...PDF_PRO.headerBg);
    doc.rect(0, fy, pageW, PRO_FOOTER_H, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    doc.setTextColor(203, 213, 225);
    doc.text("FRMT Centre National — Document Confidentiel", PRO_MARGINS.left, fy + 5);
    doc.text(`Page ${i} / ${total}`, pageW / 2, fy + 5, { align: "center" });
    doc.text(genDate, pageW - PRO_MARGINS.right, fy + 5, { align: "right" });
  }
}

export function drawSectionTitle(doc: jsPDF, x: number, y: number, title: string): number {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...PDF_PRO.textDark);
  doc.text(title.toUpperCase(), x, y);
  doc.setDrawColor(...PDF_PRO.border);
  doc.setLineWidth(0.2);
  doc.line(x, y + 1.5, x + 80, y + 1.5);
  return y + 5;
}

export function drawProKpiCards(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  kpis: { label: string; value: string; color: [number, number, number] }[]
): number {
  const n = kpis.length;
  const gap = 2.5;
  const cardW = (w - gap * (n - 1)) / n;
  const cardH = 16;

  for (let i = 0; i < n; i++) {
    const k = kpis[i]!;
    const cx = x + i * (cardW + gap);
    doc.setFillColor(...k.color);
    doc.roundedRect(cx, y, cardW, cardH, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.text(k.value, cx + cardW / 2, y + 10, { align: "center" });
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text(k.label.toUpperCase(), cx + cardW / 2, y + 14.5, { align: "center" });
  }
  return y + cardH + 4;
}

export function drawProLegend(doc: jsPDF, x: number, y: number, w: number): number {
  doc.setFillColor(...PDF_PRO.legendBg);
  doc.setDrawColor(224, 224, 224);
  doc.setLineWidth(0.2);
  doc.roundedRect(x, y, w, 11, 1.5, 1.5, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6);
  doc.setTextColor(...PDF_PRO.textDark);
  doc.text("CODE COULEUR", x + 3, y + 4);

  let cx = x + 24;
  for (const type of LEGEND_ORDER) {
    const [r, g, b] = TYPE_PDF_RGB[type];
    doc.setFillColor(r, g, b);
    doc.rect(cx, y + 3, 3, 3, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.5);
    doc.setTextColor(...PDF_PRO.textMuted);
    const lbl = PROGRAMMATION_TYPE_LABELS[type].slice(0, 22);
    doc.text(lbl, cx + 4, y + 5.5);
    cx += 4 + doc.getTextWidth(lbl) + 5;
    if (cx > x + w - 8) break;
  }
  return y + 13;
}

export function drawJoueurRowBanner(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  row: JoueurPdfRow,
  showClassement: boolean
): number {
  doc.setFillColor(...PDF_PRO.labelBg);
  doc.roundedRect(x, y, w, 10, 1, 1, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...PDF_PRO.textDark);
  doc.text(row.label.toUpperCase(), x + 3, y + 6);
  const meta: string[] = [];
  if (row.categorie) meta.push(row.categorie);
  if (showClassement && row.classement) meta.push(`Classement ${row.classement}`);
  if (meta.length) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...PDF_PRO.textMuted);
    doc.text(meta.join("  ·  "), x + w - 3, y + 6, { align: "right" });
  }
  return y + 12;
}

export function drawWeeklyPlanningMatrix(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  dateDebut: string,
  dateFin: string,
  rows: JoueurPdfRow[],
  labelWidth = 48,
  rowHeight = 14
): number {
  const cols = buildWeekColumns(dateDebut, dateFin);
  const gridRows = rows.map((r) => ({
    id: r.id,
    label: r.label,
    sub: r.categorie ?? undefined,
    events: r.events,
  }));
  return drawPlanningGanttGrid({
    doc,
    x,
    y,
    width,
    labelWidth,
    rowHeight,
    cols,
    rangeStart: parseISO(dateDebut.slice(0, 10)),
    rows: gridRows,
  });
}

export function drawMonthlyHeatmap(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  dateDebut: string,
  dateFin: string,
  rows: JoueurPdfRow[]
): number {
  const cols = buildMonthColumns(dateDebut, dateFin);
  if (!cols.length) return y;

  const labelW = 42;
  const gridW = width - labelW;
  const colW = gridW / cols.length;
  const headerH = 9;
  const rowH = 12;

  doc.setFillColor(...PDF_PRO.tableHead);
  doc.rect(x, y, labelW, headerH, "F");
  doc.rect(x + labelW, y, gridW, headerH, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6);
  doc.setTextColor(255, 255, 255);
  doc.text("JOUEUR", x + 2, y + 5.5);
  for (let i = 0; i < cols.length; i++) {
    const c = cols[i]!;
    const cx = x + labelW + i * colW;
    doc.text(c.label, cx + colW / 2, y + 4, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5);
    doc.text(c.sub, cx + colW / 2, y + 7.5, { align: "center" });
    doc.setFont("helvetica", "bold");
  }

  let cy = y + headerH;
  for (let ri = 0; ri < rows.length; ri++) {
    const row = rows[ri]!;
    const rowY = cy + ri * rowH;
    doc.setFillColor(...(ri % 2 === 0 ? PDF_PRO.rowBase : PDF_PRO.rowAlt));
    doc.rect(x, rowY, width, rowH, "F");
    doc.setDrawColor(...PDF_PRO.border);
    doc.setLineWidth(0.15);
    doc.rect(x, rowY, width, rowH);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(...PDF_PRO.textBody);
    doc.text(truncateText(doc, row.label, labelW - 4), x + 2, rowY + 7);

    for (let i = 0; i < cols.length; i++) {
      const c = cols[i]!;
      const cx = x + labelW + i * colW;
      const inMonth = row.events.filter(
        (e) =>
          e.date_debut.slice(0, 10) <= format(c.end, "yyyy-MM-dd") &&
          e.date_fin.slice(0, 10) >= format(c.start, "yyyy-MM-dd")
      );
      if (!inMonth.length) {
        doc.setFillColor(...PDF_PRO.emptyCell);
        doc.rect(cx + 0.5, rowY + 0.5, colW - 1, rowH - 1, "F");
        doc.setTextColor(...PDF_PRO.textMuted);
        doc.setFontSize(8);
        doc.text("—", cx + colW / 2, rowY + 7.5, { align: "center" });
        continue;
      }
      const dominant = inMonth[0]!.type;
      const [r, g, b] = TYPE_PDF_RGB[dominant];
      doc.setFillColor(r, g, b);
      doc.roundedRect(cx + 1, rowY + 2, colW - 2, rowH - 4, 1, 1, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.text(String(inMonth.length), cx + colW / 2, rowY + 7, { align: "center" });
    }
  }
  return cy + rows.length * rowH + 4;
}

function statutBadgeRgb(statut: ProgrammationStatut): [number, number, number] {
  if (statut === "a_venir") return PDF_PRO.statutAvenir;
  if (statut === "en_cours") return PDF_PRO.statutEnCours;
  return PDF_PRO.statutTermine;
}

function statutLabel(statut: ProgrammationStatut): string {
  if (statut === "a_venir") return "À venir";
  if (statut === "en_cours") return "En cours";
  return "Terminé";
}

export function drawProSyntheseTable(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  events: ProgrammationEvenementEnriched[],
  opts: { includeResultats: boolean; includePoints: boolean; includePrize: boolean }
): number {
  y = drawSectionTitle(doc, x, y, "Synthèse des mouvements");

  const sorted = [...events].sort((a, b) => a.date_debut.localeCompare(b.date_debut));
  const rowH = 6.5;
  const headers = ["Période", "Joueur", "Événement", "Lieu", "Pays", "Cat.", "Surface", "Type", "Statut"];
  const colW = [22, 22, 32, 22, 14, 14, 14, 18, 16];
  if (opts.includeResultats) {
    headers.push("Résultat");
    colW.push(18);
  }
  if (opts.includePoints) {
    headers.push("Pts");
    colW.push(12);
  }
  if (opts.includePrize) {
    headers.push("Prize $");
    colW.push(14);
  }

  let cy = y;
  doc.setFillColor(...PDF_PRO.tableHead);
  doc.rect(x, cy, w, rowH, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(5.5);
  doc.setTextColor(255, 255, 255);
  let hx = x + 1;
  for (let i = 0; i < headers.length; i++) {
    doc.text(headers[i]!, hx, cy + 4.2);
    hx += colW[i] ?? 14;
  }
  cy += rowH;

  const maxRows = 18;
  for (let i = 0; i < Math.min(sorted.length, maxRows); i++) {
    const ev = sorted[i]!;
    doc.setFillColor(...(i % 2 === 0 ? PDF_PRO.rowBase : PDF_PRO.rowAlt));
    doc.rect(x, cy, w, rowH, "F");
    doc.setDrawColor(...PDF_PRO.borderLight);
    doc.setLineWidth(0.1);
    doc.rect(x, cy, w, rowH);

    const joueur = [ev.joueur_prenom, ev.joueur_nom].filter(Boolean).join(" ") || "—";
    const cells = [
      formatPeriodePdf(ev.date_debut, ev.date_fin).slice(0, 18),
      joueur,
      ev.nom,
      ev.ville ?? "—",
      ev.pays ?? "—",
      ev.categorie_tournoi ?? "—",
      ev.surface ?? "—",
      PROGRAMMATION_TYPE_SHORT[ev.type],
      statutLabel(ev.statut),
    ];
    if (opts.includeResultats) cells.push(ev.resultat_simple ?? "—");
    if (opts.includePoints) cells.push(ev.points_gagnes != null ? String(ev.points_gagnes) : "—");
    if (opts.includePrize) cells.push(ev.prize_money_usd != null ? String(ev.prize_money_usd) : "—");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(5);
    doc.setTextColor(...PDF_PRO.textBody);
    let cx = x + 1;
    for (let j = 0; j < cells.length; j++) {
      if (j === 7) {
        const [r, g, b] = TYPE_PDF_RGB[ev.type];
        doc.setFillColor(r, g, b);
        doc.roundedRect(cx, cy + 1.2, (colW[j] ?? 14) - 2, 4, 0.5, 0.5, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(4.5);
        doc.text(truncateText(doc, cells[j]!, (colW[j] ?? 14) - 3), cx + 1, cy + 4);
        doc.setTextColor(...PDF_PRO.textBody);
        doc.setFontSize(5);
      } else if (j === 8) {
        const [r, g, b] = statutBadgeRgb(ev.statut);
        doc.setFillColor(r, g, b);
        doc.roundedRect(cx, cy + 1.2, (colW[j] ?? 14) - 2, 4, 0.5, 0.5, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(4.5);
        doc.text(cells[j]!, cx + 1, cy + 4);
        doc.setTextColor(...PDF_PRO.textBody);
      } else {
        doc.text(truncateText(doc, cells[j]!, (colW[j] ?? 14) - 2), cx, cy + 4.2);
      }
      cx += colW[j] ?? 14;
    }
    cy += rowH;
  }

  if (sorted.length) {
    doc.setFillColor(...PDF_PRO.totalRow);
    doc.rect(x, cy, w, rowH, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(5.5);
    doc.setTextColor(...PDF_PRO.textDark);
    const pts = sorted.reduce((s, e) => s + (e.points_gagnes ?? 0), 0);
    const prize = sorted.reduce((s, e) => s + Number(e.prize_money_usd ?? 0), 0);
    doc.text(`Total : ${sorted.length} événement(s)`, x + 2, cy + 4.2);
    if (opts.includePoints) doc.text(`Points : ${pts}`, x + 70, cy + 4.2);
    if (opts.includePrize) doc.text(`Prize : ${prize} USD`, x + 110, cy + 4.2);
    cy += rowH;
  }

  return cy + 3;
}

export function drawCoverPage(
  doc: jsPDF,
  opts: {
    pageW: number;
    pageH: number;
    title: string;
    subtitle: string;
    periode: string;
    joueurs: JoueurPdfRow[];
    logo?: string;
  }
) {
  const { pageW, pageH, title, subtitle, periode, joueurs, logo } = opts;
  doc.setFillColor(...PDF_PRO.headerBg);
  doc.rect(0, 0, pageW, pageH, "F");

  if (logo?.startsWith("data:")) {
    try {
      doc.addImage(logo, "PNG", pageW / 2 - 25, 25, 50, 50);
    } catch {
      /* ignore */
    }
  }

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text(title, pageW / 2, 90, { align: "center" });
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(203, 213, 225);
  doc.text(subtitle, pageW / 2, 100, { align: "center" });

  let y = 115;
  const cardW = Math.min(80, (pageW - 40) / 2);
  for (let i = 0; i < Math.min(joueurs.length, 8); i++) {
    const j = joueurs[i]!;
    const col = i % 2;
    const row = Math.floor(i / 2);
    const cx = 20 + col * (cardW + 8);
    const cy = y + row * 14;
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(cx, cy, cardW, 12, 2, 2, "F");
    doc.setTextColor(...PDF_PRO.textDark);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(j.label, cx + 4, cy + 7.5);
  }

  doc.setTextColor(226, 232, 240);
  doc.setFontSize(10);
  doc.text(periode, pageW / 2, pageH - 35, { align: "center" });
  doc.setFontSize(7);
  doc.text("FRMT — Fédération Royale Marocaine de Tennis", pageW / 2, pageH - 20, { align: "center" });
  doc.text(PDF_META.author, pageW / 2, pageH - 14, { align: "center" });
}

export function drawFicheIdentite(
  doc: jsPDF,
  row: JoueurPdfRow,
  kpis: ReturnType<typeof import("@/lib/pdf/programmation/dataPreparation").computeKpis>,
  dateDebut: string,
  dateFin: string,
  logo?: string
): number {
  const pageW = doc.internal.pageSize.getWidth();
  let y = drawProHeader(doc, {
    pageW,
    title: "Fiche individuelle joueur",
    subtitle: formatPeriodePdf(dateDebut, dateFin),
    generatedBy: "Staff FRMT",
    logo,
  });

  const ml = PRO_MARGINS.left;
  const w = pageW - ml - PRO_MARGINS.right;

  doc.setFillColor(...PDF_PRO.labelBg);
  doc.roundedRect(ml, y, w, 35, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...PDF_PRO.textDark);
  doc.text(row.label, ml + 5, y + 12);
  if (row.classement) {
    doc.setFontSize(10);
    doc.text(`Classement : ${row.classement}`, ml + 5, y + 20);
  }
  if (row.categorie) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...PDF_PRO.textMuted);
    doc.text(row.categorie, ml + 5, y + 28);
  }

  y += 40;
  y = drawProKpiCards(doc, ml, y, w, [
    { label: "Tournois", value: String(kpis.tournois), color: PDF_PRO.kpiTournois },
    { label: "Stages", value: String(kpis.stages), color: PDF_PRO.kpiStages },
    { label: "Sem. actives", value: String(kpis.semaines), color: PDF_PRO.kpiSemaines },
    { label: "Pays", value: String(kpis.pays), color: PDF_PRO.kpiPays },
    { label: "Points", value: String(kpis.points), color: PDF_PRO.kpiPoints },
  ]);

  return y;
}

export function drawRankingBars(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  events: ProgrammationEvenementEnriched[]
): number {
  y = drawSectionTitle(doc, x, y, "Activité sur la période");
  const tournois = events.filter((e) => e.type !== "repos" && e.type !== "blessure").slice(0, 12);
  if (!tournois.length) return y + 4;

  const barMaxH = 25;
  const barW = Math.min(12, (w - 10) / tournois.length);
  let bx = x + 5;
  const maxPts = Math.max(1, ...tournois.map((e) => e.points_gagnes ?? 1));

  for (const ev of tournois) {
    const pts = ev.points_gagnes ?? 0;
    const h = (pts / maxPts) * barMaxH || 2;
    const [r, g, b] = TYPE_PDF_RGB[ev.type];
    doc.setFillColor(r, g, b);
    doc.rect(bx, y + barMaxH - h, barW - 1, h, "F");
    doc.setFontSize(4);
    doc.setTextColor(...PDF_PRO.textMuted);
    doc.text(format(parseISO(ev.date_debut.slice(0, 10)), "d/M"), bx + barW / 2, y + barMaxH + 3, {
      align: "center",
    });
    bx += barW;
  }
  return y + barMaxH + 8;
}

export function drawComparatifTable(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  rows: JoueurPdfRow[]
): number {
  y = drawSectionTitle(doc, x, y, "Tableau comparatif");
  const headers = ["Joueur", "Sem. compét.", "Tournois", "Points", "Prize $", "Pays", "Ratio V."];
  const colW = [40, 22, 18, 18, 22, 14, 18];
  const rowH = 7;

  let cy = y;
  doc.setFillColor(...PDF_PRO.tableHead);
  doc.rect(x, cy, w, rowH, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6);
  doc.setTextColor(255, 255, 255);
  let hx = x + 2;
  for (let i = 0; i < headers.length; i++) {
    doc.text(headers[i]!, hx, cy + 4.5);
    hx += colW[i] ?? 16;
  }
  cy += rowH;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!;
    const tournois = row.events.filter((e) =>
      ["tournoi_itf", "tournoi_atp_wta", "coupe_davis", "bjk_cup"].includes(e.type)
    ).length;
    const pts = row.events.reduce((s, e) => s + (e.points_gagnes ?? 0), 0);
    const prize = row.events.reduce((s, e) => s + Number(e.prize_money_usd ?? 0), 0);
    const pays = new Set(row.events.map((e) => e.pays).filter(Boolean)).size;
    const wins = row.events.filter((e) => e.resultat_simple?.toLowerCase().includes("v")).length;
    const ratio = row.events.length ? `${Math.round((wins / row.events.length) * 100)}%` : "—";

    doc.setFillColor(...(i % 2 === 0 ? PDF_PRO.rowBase : PDF_PRO.rowAlt));
    doc.rect(x, cy, w, rowH, "F");
    const cells = [row.label, "—", String(tournois), String(pts), String(prize), String(pays), ratio];
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.5);
    doc.setTextColor(...PDF_PRO.textBody);
    let cx = x + 2;
    for (let j = 0; j < cells.length; j++) {
      doc.text(truncateText(doc, cells[j]!, (colW[j] ?? 14) - 2), cx, cy + 4.5);
      cx += colW[j] ?? 14;
    }
    cy += rowH;
  }
  return cy + 4;
}

export { buildWeekColumns, buildMonthColumns, type TimeColumn };
