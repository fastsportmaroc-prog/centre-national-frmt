import "server-only";

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { loadPdfLogoBase64 } from "@/lib/pdf/load-pdf-logo";
import { PDF_META } from "@/lib/pdf/pdfDesignSystem";
import { drawProFooter } from "@/lib/pdf/programmation/engine.server";
import {
  getPlanningCnePalette,
  PLANNING_CNE_COLORS,
  PLANNING_CNE_HEADER,
  type PlanningCneColorKey,
} from "@/lib/programmation-joueurs/planning-cne-colors";
import {
  buildPlanningCneGrid,
  type PlanningCneColumn,
} from "@/lib/programmation-joueurs/planning-cne-grid";
import {
  resolvePlanningCneColumns,
  type PlanningCneExcelInput,
} from "@/lib/programmation-joueurs/planning-cne-excel.server";
import { formatPlanningCnePeriodFr } from "@/lib/programmation-joueurs/planning-cne-period";

const MARGIN = 8;
const TITLE_H = 9;
const PERIOD_H = 7;
const MAX_COLS_PER_PAGE = 7;
const MAX_ROWS_PER_PAGE = 28;

type Rgb = [number, number, number];

type CellStyle = {
  fill: Rgb;
  text: Rgb;
  fontStyle: "normal" | "bold";
  lineWidth?: number;
  lineColor?: Rgb;
};

function hexToRgb(hex: string): Rgb {
  const h = hex.replace("#", "");
  if (h.length !== 6) return [255, 255, 255];
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function chunk<T>(items: T[], size: number): T[][] {
  if (!items.length) return [[]];
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function styleForColorKey(key: PlanningCneColorKey): CellStyle {
  const colors = getPlanningCnePalette(key);
  if (key === "alerte") {
    return {
      fill: [255, 255, 255],
      text: hexToRgb(colors.text),
      fontStyle: "bold",
      lineWidth: 0.35,
      lineColor: hexToRgb(colors.border),
    };
  }
  return {
    fill: hexToRgb(colors.bg),
    text: hexToRgb(colors.text),
    fontStyle: "normal",
  };
}

function drawTitleBlock(doc: jsPDF, y: number, periodLabel: string): number {
  const pageW = doc.internal.pageSize.getWidth();
  const innerW = pageW - MARGIN * 2;

  doc.setFillColor(0, 0, 0);
  doc.rect(MARGIN, y, innerW, TITLE_H, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text("PLANNING CNE — FRMT Centre National", pageW / 2, y + 6, { align: "center" });

  const periodY = y + TITLE_H;
  doc.setFillColor(26, 71, 42);
  doc.rect(MARGIN, periodY, innerW, PERIOD_H, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text(periodLabel, pageW / 2, periodY + 4.8, { align: "center" });

  return periodY + PERIOD_H + 2;
}

function drawLegend(doc: jsPDF, startY: number): number {
  const pageW = doc.internal.pageSize.getWidth();
  const x = MARGIN;
  let y = startY + 4;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(30, 30, 30);
  doc.text("LÉGENDE", x, y);
  y += 5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  const items = Object.values(PLANNING_CNE_COLORS);
  const colW = (pageW - MARGIN * 2) / 2;
  items.forEach((item, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const cx = x + col * colW;
    const cy = y + row * 5.5;
    const fill = item.bg === "transparent" ? ([255, 255, 255] as Rgb) : hexToRgb(item.bg);
    doc.setFillColor(...fill);
    doc.setDrawColor(...hexToRgb(item.border));
    doc.rect(cx, cy - 3, 5, 3.5, "FD");
    doc.setTextColor(50, 50, 50);
    doc.text(item.label, cx + 6.5, cy);
  });

  return y + Math.ceil(items.length / 2) * 5.5 + 4;
}

function buildTableForChunk(
  colChunk: PlanningCneColumn[],
  rowChunk: ReturnType<typeof buildPlanningCneGrid>
): { head: string[][]; body: string[][]; styles: Map<string, CellStyle> } {
  const head = [
    ["DATE", "JOUR", "MOIS", ...colChunk.map((c) => `${c.prenom}\n${c.nom}`.trim().toUpperCase())],
  ];
  const body: string[][] = [];
  const styles = new Map<string, CellStyle>();

  rowChunk.forEach((row, ri) => {
    const line = [row.dateLabel, row.jourLabel, row.moisLabel];
    colChunk.forEach((col, ci) => {
      const events = row.cells[col.id] ?? [];
      line.push(
        events
          .map((e) => {
            const s = e.style;
            const parts = [e.label];
            if (s.subtitle) parts.push(s.subtitle);
            if (s.badge) parts.push(s.badge);
            return parts.join(" ");
          })
          .join("\n")
      );
      if (events.length) {
        const primary = events[0]!;
        styles.set(`${ri}-${ci + 3}`, styleForColorKey(primary.style.colorKey));
      }
    });
    body.push(line);
  });

  return { head, body, styles };
}

function computeColumnWidths(tableW: number, colCount: number) {
  const dateW = 14;
  const jourW = 18;
  const moisW = 14;
  const fixedW = dateW + jourW + moisW;
  const playerW = Math.max(20, (tableW - fixedW) / Math.max(1, colCount));
  return { dateW, jourW, moisW, playerW };
}

function drawGridTable(
  doc: jsPDF,
  startY: number,
  colChunk: PlanningCneColumn[],
  table: ReturnType<typeof buildTableForChunk>,
  opts?: { showHeadEveryPage?: boolean }
): number {
  const pageW = doc.internal.pageSize.getWidth();
  const tableW = pageW - MARGIN * 2;
  const { dateW, jourW, moisW, playerW } = computeColumnWidths(tableW, colChunk.length);

  const columnStyles: Record<string, { cellWidth: number; halign: "left" | "center" }> = {
    "0": { cellWidth: dateW, halign: "center" },
    "1": { cellWidth: jourW, halign: "center" },
    "2": { cellWidth: moisW, halign: "center" },
  };
  colChunk.forEach((_, i) => {
    columnStyles[String(i + 3)] = { cellWidth: playerW, halign: "left" };
  });

  autoTable(doc, {
    startY,
    margin: { left: MARGIN, right: MARGIN, top: MARGIN, bottom: 14 },
    tableWidth: tableW,
    head: table.head,
    body: table.body,
    theme: "grid",
    showHead: opts?.showHeadEveryPage ? "everyPage" : true,
    rowPageBreak: "avoid",
    styles: {
      font: "helvetica",
      fontSize: 5.5,
      cellPadding: 1.2,
      valign: "middle",
      overflow: "linebreak",
      lineWidth: 0.1,
      lineColor: [200, 200, 200],
      minCellHeight: 6,
    },
    headStyles: {
      fontStyle: "bold",
      fontSize: 5.5,
      halign: "center",
      valign: "middle",
      minCellHeight: 11,
      overflow: "linebreak",
    },
    columnStyles,
    didParseCell: (hook) => {
      const idx = hook.column.index;
      if (hook.section === "head") {
        if (idx < 3) {
          hook.cell.styles.fillColor = hexToRgb(PLANNING_CNE_HEADER.date.bg);
          hook.cell.styles.textColor = hexToRgb(PLANNING_CNE_HEADER.date.text);
        } else {
          const col = colChunk[idx - 3];
          const header =
            col?.kind === "coach" ? PLANNING_CNE_HEADER.coach : PLANNING_CNE_HEADER.joueur;
          hook.cell.styles.fillColor = hexToRgb(header.bg);
          hook.cell.styles.textColor = hexToRgb(header.text);
        }
        return;
      }
      if (hook.section === "body") {
        if (idx < 3) {
          hook.cell.styles.fillColor = [245, 245, 245];
          hook.cell.styles.textColor = [30, 30, 30];
          hook.cell.styles.fontStyle = idx === 0 ? "bold" : "normal";
          return;
        }
        const style = table.styles.get(`${hook.row.index}-${idx}`);
        if (style) {
          hook.cell.styles.fillColor = style.fill;
          hook.cell.styles.textColor = style.text;
          hook.cell.styles.fontStyle = style.fontStyle;
          if (style.lineWidth != null) hook.cell.styles.lineWidth = style.lineWidth;
          if (style.lineColor) hook.cell.styles.lineColor = style.lineColor;
        } else {
          hook.cell.styles.fillColor = [255, 255, 255];
          hook.cell.styles.textColor = [30, 30, 30];
        }
      }
    },
  });

  const last = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable;
  return last?.finalY ?? startY + 20;
}

export async function generatePlanningCnePdf(
  input: PlanningCneExcelInput & { generatedBy: string }
): Promise<{ buffer: Uint8Array; filename: string }> {
  const columns = await resolvePlanningCneColumns(input);
  if (!columns.length) throw new Error("Aucune colonne à exporter");

  const visibleIds = new Set(columns.map((c) => c.id));
  const events = input.evenements.filter((e) => {
    const colId = e.cne_column_id ?? e.joueur_id;
    return visibleIds.has(colId);
  });

  const rows = buildPlanningCneGrid({
    rangeStart: input.dateDebut,
    rangeEnd: input.dateFin,
    columns,
    evenements: events,
    visibleColumnIds: visibleIds,
  });

  const logo = await loadPdfLogoBase64();
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a3" });
  doc.setProperties({
    title: "Planning CNE FRMT",
    creator: PDF_META.creator,
    author: PDF_META.author,
  });

  const colChunks = chunk(columns, MAX_COLS_PER_PAGE);
  const rowChunks = chunk(rows, MAX_ROWS_PER_PAGE);
  const periodLabel = formatPlanningCnePeriodFr(input.dateDebut, input.dateFin);
  let pageIndex = 0;

  for (let ci = 0; ci < colChunks.length; ci++) {
    const colChunk = colChunks[ci]!;
    for (let ri = 0; ri < rowChunks.length; ri++) {
      const rowChunk = rowChunks[ri]!;
      if (pageIndex > 0) doc.addPage();
      pageIndex++;

      let y = MARGIN;
      if (logo?.startsWith("data:")) {
        try {
          doc.addImage(logo, "PNG", MARGIN, y, 10, 10);
        } catch {
          /* ignore */
        }
      }

      doc.setFont("helvetica", "normal");
      doc.setFontSize(6);
      doc.setTextColor(100, 100, 100);
      const pageW = doc.internal.pageSize.getWidth();
      doc.text(
        `Généré par ${input.generatedBy} — ${format(new Date(), "dd/MM/yyyy")}`,
        pageW - MARGIN,
        y + 4,
        { align: "right" }
      );
      if (colChunks.length > 1 || rowChunks.length > 1) {
        doc.text(
          `Colonnes ${ci + 1}/${colChunks.length} · Jours ${ri + 1}/${rowChunks.length}`,
          pageW - MARGIN,
          y + 8,
          { align: "right" }
        );
      }
      y += 12;

      y = drawTitleBlock(doc, y, periodLabel);
      const table = buildTableForChunk(colChunk, rowChunk);
      drawGridTable(doc, y, colChunk, table, { showHeadEveryPage: rowChunks.length > 1 });
    }
  }

  doc.addPage();
  let legendY = MARGIN + 8;
  legendY = drawLegend(doc, legendY);
  drawProFooter(doc);

  const startLabel = input.dateDebut.slice(0, 10);
  const endLabel = input.dateFin.slice(0, 10);
  const filename = `Planning_CNE_FRMT_${startLabel}_${endLabel}.pdf`;

  return { buffer: new Uint8Array(doc.output("arraybuffer")), filename };
}
