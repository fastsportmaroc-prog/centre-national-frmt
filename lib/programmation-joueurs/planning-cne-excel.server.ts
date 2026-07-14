import "server-only";

import ExcelJS from "exceljs";
import { filterJoueursByCategory } from "@/lib/auth/player-category-access";
import type { ServerPlayerCategoryContext } from "@/lib/auth/player-category-context.server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getSupabaseServerDataClient } from "@/lib/supabase/data-client.server";
import {
  PLANNING_CNE_COLORS,
  PLANNING_CNE_HEADER,
  PLANNING_CNE_STAGE_LEGEND,
} from "@/lib/programmation-joueurs/planning-cne-colors";
import {
  buildCoachColumns,
  buildJoueurColumns,
  buildPlanningCneGrid,
  filterColumnsByDisplay,
  type PlanningCneColumn,
  type PlanningCneDisplayMode,
} from "@/lib/programmation-joueurs/planning-cne-grid";
import { formatPlanningCnePeriodFr } from "@/lib/programmation-joueurs/planning-cne-period";
import type { ProgrammationEvenementEnriched } from "@/lib/types/programmation-joueurs";
import type { EntraineurV2, JoueurV2 } from "@/lib/types/v2";
import { matchesJoueurCategoryFilter } from "@/lib/utils/joueur";

export type PlanningCneExcelInput = {
  dateDebut: string;
  dateFin: string;
  columnIds: string[];
  displayMode: PlanningCneDisplayMode;
  categorieJoueur?: string;
  evenements: ProgrammationEvenementEnriched[];
  ctx: ServerPlayerCategoryContext;
};

function hexToArgb(hex: string): string {
  const h = hex.replace("#", "").toUpperCase();
  return h.length === 6 ? `FF${h}` : h;
}

function solidFill(hex: string): ExcelJS.Fill {
  return { type: "pattern", pattern: "solid", fgColor: { argb: hexToArgb(hex) } };
}

function fontColor(hex: string, bold = false, size = 10): Partial<ExcelJS.Font> {
  return { color: { argb: hexToArgb(hex) }, bold, size };
}

async function loadJoueurs(ctx: ServerPlayerCategoryContext, categorieJoueur?: string): Promise<JoueurV2[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await getSupabaseServerDataClient();
  const { data } = await supabase.from("joueurs").select("*").order("nom");
  let list = (data ?? []) as JoueurV2[];
  list = filterJoueursByCategory(list, ctx.allowedCategories, ctx.bypassFilter);
  if (categorieJoueur) {
    list = list.filter((j) => matchesJoueurCategoryFilter(j, categorieJoueur));
  }
  return list.filter((j) => (j.statut ?? "actif") === "actif");
}

async function loadCoaches(): Promise<EntraineurV2[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await getSupabaseServerDataClient();
  const { data, error } = await supabase.from("entraineurs").select("*").order("nom");
  if (error) {
    console.warn("[planning-cne-export] entraineurs:", error.message);
    return [];
  }
  return ((data ?? []) as EntraineurV2[]).filter((c) => (c.statut ?? "actif") === "actif");
}

function styleHeaderCell(
  cell: ExcelJS.Cell,
  value: string,
  bg: string,
  fg: string,
  opts?: { wrap?: boolean; hAlign?: "left" | "center" | "right" }
) {
  cell.value = value;
  cell.fill = solidFill(bg);
  cell.font = fontColor(fg, true, 10);
  cell.alignment = {
    vertical: "middle",
    horizontal: opts?.hAlign ?? "center",
    wrapText: opts?.wrap ?? true,
  };
  cell.border = thinBorder();
}

function thinBorder(color = "FF000000"): Partial<ExcelJS.Borders> {
  const side: Partial<ExcelJS.Border> = { style: "thin", color: { argb: color } };
  return { top: side, left: side, bottom: side, right: side };
}

export async function resolvePlanningCneColumns(
  input: Pick<PlanningCneExcelInput, "columnIds" | "displayMode" | "categorieJoueur" | "ctx">
): Promise<PlanningCneColumn[]> {
  const [joueurs, coaches] = await Promise.all([
    loadJoueurs(input.ctx, input.categorieJoueur),
    loadCoaches(),
  ]);
  const all = filterColumnsByDisplay(
    [...buildJoueurColumns(joueurs), ...buildCoachColumns(coaches)],
    input.displayMode
  );
  const allowed = new Set(input.columnIds);
  return all.filter((c) => allowed.has(c.id));
}

export async function generatePlanningCneExcel(
  input: PlanningCneExcelInput
): Promise<{ buffer: Buffer; filename: string }> {
  const columns = await resolvePlanningCneColumns(input);
  if (!columns.length) {
    throw new Error("Aucune colonne à exporter");
  }

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

  const wb = new ExcelJS.Workbook();
  wb.creator = "FRMT Centre National";
  const ws = wb.addWorksheet("Planning CNE", {
    views: [{ state: "frozen", xSplit: 3, ySplit: 3 }],
  });

  const totalCols = 3 + columns.length;
  const periodLabel = formatPlanningCnePeriodFr(input.dateDebut, input.dateFin);

  ws.mergeCells(1, 1, 1, totalCols);
  const titleCell = ws.getCell(1, 1);
  titleCell.value = "PLANNING CNE — FRMT Centre National";
  titleCell.fill = solidFill("#000000");
  titleCell.font = fontColor("#FFFFFF", true, 13);
  titleCell.alignment = { vertical: "middle", horizontal: "center" };
  ws.getRow(1).height = 28;

  ws.mergeCells(2, 1, 2, totalCols);
  const periodCell = ws.getCell(2, 1);
  periodCell.value = periodLabel;
  periodCell.fill = solidFill("#1a472a");
  periodCell.font = fontColor("#FFFFFF", true, 11);
  periodCell.alignment = { vertical: "middle", horizontal: "center" };
  ws.getRow(2).height = 22;

  const headerRow = ws.getRow(3);
  headerRow.height = 36;
  styleHeaderCell(ws.getCell(3, 1), "DATE", PLANNING_CNE_HEADER.date.bg, PLANNING_CNE_HEADER.date.text);
  styleHeaderCell(ws.getCell(3, 2), "JOUR", PLANNING_CNE_HEADER.date.bg, PLANNING_CNE_HEADER.date.text);
  styleHeaderCell(ws.getCell(3, 3), "MOIS", PLANNING_CNE_HEADER.date.bg, PLANNING_CNE_HEADER.date.text);

  columns.forEach((col, i) => {
    const header = col.kind === "coach" ? PLANNING_CNE_HEADER.coach : PLANNING_CNE_HEADER.joueur;
    const cell = ws.getCell(3, 4 + i);
    styleHeaderCell(cell, `${col.prenom}\n${col.nom}`.trim(), header.bg, header.text);
  });

  ws.getColumn(1).width = 12;
  ws.getColumn(2).width = 14;
  ws.getColumn(3).width = 12;
  for (let c = 4; c <= totalCols; c++) {
    ws.getColumn(c).width = 18;
  }

  rows.forEach((row, rowIdx) => {
    const excelRow = ws.getRow(4 + rowIdx);
    excelRow.height = 22;

    const dateCell = ws.getCell(4 + rowIdx, 1);
    dateCell.value = row.dateLabel;
    dateCell.alignment = { vertical: "middle", horizontal: "center" };
    dateCell.border = thinBorder("FFCCCCCC");
    dateCell.fill = solidFill("#F5F5F5");

    const jourCell = ws.getCell(4 + rowIdx, 2);
    jourCell.value = row.jourLabel;
    jourCell.alignment = { vertical: "middle", horizontal: "center" };
    jourCell.border = thinBorder("FFCCCCCC");
    jourCell.fill = solidFill("#F5F5F5");

    const moisCell = ws.getCell(4 + rowIdx, 3);
    moisCell.value = row.moisLabel;
    moisCell.alignment = { vertical: "middle", horizontal: "center" };
    moisCell.border = thinBorder("FFCCCCCC");
    moisCell.fill = solidFill("#F5F5F5");

    columns.forEach((col, colIdx) => {
      const cell = ws.getCell(4 + rowIdx, 4 + colIdx);
      const events = row.cells[col.id] ?? [];
      if (!events.length) {
        cell.value = "";
        cell.border = thinBorder("FFCCCCCC");
        return;
      }

      const labels = events.map((e) => {
        const s = e.style;
        const parts = [e.label];
        if (s.subtitle) parts.push(s.subtitle);
        if (s.badge) parts.push(s.badge);
        return parts.join(" ");
      });
      cell.value = labels.join("\n");
      cell.alignment = { vertical: "top", horizontal: "left", wrapText: true };

      const primary = events[0]!;
      const style = primary.style;
      const isAlert = style.colorKey === "alerte";

      if (isAlert) {
        cell.fill = solidFill("#FFFFFF");
        cell.font = fontColor(style.text, true, 9);
        cell.border = thinBorder(style.borderColor);
      } else {
        cell.fill = solidFill(style.bg);
        cell.font = fontColor(style.text, false, 9);
        cell.border = thinBorder("FFCCCCCC");
      }

      if (labels.length > 1) excelRow.height = Math.max(excelRow.height ?? 22, 16 * labels.length);
    });
  });

  const legendStart = 4 + rows.length + 2;
  ws.mergeCells(legendStart, 1, legendStart, totalCols);
  const legendTitle = ws.getCell(legendStart, 1);
  legendTitle.value = "LÉGENDE";
  legendTitle.font = fontColor("#1a1a1a", true, 11);
  legendTitle.alignment = { horizontal: "left" };

  Object.values(PLANNING_CNE_COLORS).forEach((item, i) => {
    const r = legendStart + 1 + i;
    const swatch = ws.getCell(r, 1);
    swatch.fill =
      item.bg === "transparent" ? solidFill("#FFFFFF") : solidFill(item.bg);
    swatch.border = thinBorder(item.border);
    const label = ws.getCell(r, 2);
    ws.mergeCells(r, 2, r, Math.min(4, totalCols));
    label.value = item.label;
    label.font = fontColor("#333333", false, 10);
    label.alignment = { vertical: "middle", horizontal: "left" };
  });

  PLANNING_CNE_STAGE_LEGEND.forEach((item, i) => {
    const r = legendStart + 1 + Object.keys(PLANNING_CNE_COLORS).length + i;
    const swatch = ws.getCell(r, 1);
    swatch.fill = solidFill(item.bg);
    swatch.border = thinBorder(item.border);
    const label = ws.getCell(r, 2);
    ws.mergeCells(r, 2, r, Math.min(4, totalCols));
    label.value = item.label;
    label.font = fontColor("#333333", false, 10);
    label.alignment = { vertical: "middle", horizontal: "left" };
  });

  const startLabel = input.dateDebut.slice(0, 10);
  const endLabel = input.dateFin.slice(0, 10);
  const filename = `Planning_CNE_FRMT_${startLabel}_${endLabel}.xlsx`;

  const buffer = Buffer.from(await wb.xlsx.writeBuffer());
  return { buffer, filename };
}
