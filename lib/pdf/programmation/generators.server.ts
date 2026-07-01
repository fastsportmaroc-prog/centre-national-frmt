import "server-only";

import { jsPDF } from "jspdf";
import { format } from "date-fns";
import type { ProgrammationPdfContext } from "@/lib/pdf/programmation/types";
import { buildJoueurRows } from "@/lib/pdf/programmation/dataPreparation";
import {
  drawDeplacementsSemaineTable,
  drawProFooter,
  drawProHeader,
  drawProLegend,
  PRO_MARGINS,
} from "@/lib/pdf/programmation/engine.server";
import { buildWeekColumns } from "@/lib/programmation-joueurs/pdf-planning-draw.server";
import { formatPeriodePdf } from "@/lib/pdf/pdf-format";
import { PDF_META } from "@/lib/pdf/pdfDesignSystem";

function contentWidth(doc: jsPDF) {
  const pageW = doc.internal.pageSize.getWidth();
  return pageW - PRO_MARGINS.left - PRO_MARGINS.right;
}

function chunkWeekRange(dateDebut: string, dateFin: string, maxWeeks: number) {
  const all = buildWeekColumns(dateDebut, dateFin);
  if (!all.length) return [{ debut: dateDebut, fin: dateFin }];
  const chunks: { debut: string; fin: string }[] = [];
  for (let i = 0; i < all.length; i += maxWeeks) {
    const slice = all.slice(i, i + maxWeeks);
    const first = slice[0]!;
    const last = slice[slice.length - 1]!;
    chunks.push({
      debut: format(first.start, "yyyy-MM-dd"),
      fin: format(last.end, "yyyy-MM-dd"),
    });
  }
  return chunks;
}

/** PDF unique : tableau déplacements joueur × semaine (Maroc / étranger). */
export function generateDeplacementsPdf(ctx: ProgrammationPdfContext): jsPDF {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  doc.setProperties({
    title: "Planning déplacements FRMT",
    creator: PDF_META.creator,
    author: PDF_META.author,
  });

  const rows = buildJoueurRows(ctx);
  const pageW = doc.internal.pageSize.getWidth();
  const ml = PRO_MARGINS.left;
  const w = contentWidth(doc);
  const weekChunks = chunkWeekRange(ctx.dateDebut, ctx.dateFin, 14);

  for (let ci = 0; ci < weekChunks.length; ci++) {
    const chunk = weekChunks[ci]!;
    if (ci > 0) doc.addPage();

    let y = drawProHeader(doc, {
      pageW,
      title: ci === 0 ? "Planning des déplacements" : `Déplacements (suite ${ci + 1})`,
      subtitle: formatPeriodePdf(chunk.debut, chunk.fin),
      generatedBy: ctx.generatedBy,
      logo: ctx.logoBase64,
    });

    y = drawProLegend(doc, ml, y, w);
    drawDeplacementsSemaineTable(doc, ml, y, w, chunk.debut, chunk.fin, rows);
  }

  drawProFooter(doc);
  return doc;
}
