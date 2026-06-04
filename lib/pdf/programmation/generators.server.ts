import "server-only";

import { jsPDF } from "jspdf";
import {
  addMonths,
  endOfMonth,
  endOfQuarter,
  format,
  parseISO,
  startOfMonth,
  startOfQuarter,
} from "date-fns";
import { fr } from "date-fns/locale";
import type { ProgrammationPdfContext } from "@/lib/pdf/programmation/types";
import { buildJoueurRows, computeKpis } from "@/lib/pdf/programmation/dataPreparation";
import {
  drawComparatifTable,
  drawCoverPage,
  drawFicheIdentite,
  drawProFooter,
  drawProHeader,
  drawProKpiCards,
  drawProLegend,
  drawProSyntheseTable,
  drawJoueurRowBanner,
  drawMonthlyHeatmap,
  drawRankingBars,
  drawWeeklyPlanningMatrix,
  PRO_MARGINS,
} from "@/lib/pdf/programmation/engine.server";
import { PDF_PRO } from "@/lib/pdf/programmation/couleurs";
import { formatPeriodePdf } from "@/lib/pdf/pdf-format";
import { PDF_META } from "@/lib/pdf/pdfDesignSystem";
import { typePdfTitle } from "@/lib/pdf/programmation/formatters";

function contentWidth(doc: jsPDF) {
  const pageW = doc.internal.pageSize.getWidth();
  return pageW - PRO_MARGINS.left - PRO_MARGINS.right;
}

function kpiStrip(kpis: ReturnType<typeof computeKpis>, includePoints: boolean) {
  const cards = [
    { label: "Tournois", value: String(kpis.tournois), color: PDF_PRO.kpiTournois },
    { label: "Stages", value: String(kpis.stages), color: PDF_PRO.kpiStages },
    { label: "Sem. actives", value: String(kpis.semaines), color: PDF_PRO.kpiSemaines },
    { label: "Pays visités", value: String(kpis.pays), color: PDF_PRO.kpiPays },
  ];
  if (includePoints) {
    cards.push({ label: "Points", value: String(kpis.points), color: PDF_PRO.kpiPoints });
  }
  return cards;
}

function newLandscapeDoc() {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  doc.setProperties({
    title: "Planning joueurs FRMT",
    creator: PDF_META.creator,
    author: PDF_META.author,
  });
  return doc;
}

function newPortraitDoc() {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  doc.setProperties({
    title: "Fiche joueur FRMT",
    creator: PDF_META.creator,
    author: PDF_META.author,
  });
  return doc;
}

function addPlanningPage(
  doc: jsPDF,
  ctx: ProgrammationPdfContext,
  title: string,
  rows: ReturnType<typeof buildJoueurRows>,
  allEvents: typeof ctx.evenements,
  useMonths: boolean,
  addPageBefore: boolean
) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const ml = PRO_MARGINS.left;
  const w = contentWidth(doc);

  if (addPageBefore) doc.addPage();

  const kpis = computeKpis(allEvents);
  let y = drawProHeader(doc, {
    pageW,
    title,
    subtitle: formatPeriodePdf(ctx.dateDebut, ctx.dateFin),
    generatedBy: ctx.generatedBy,
    logo: ctx.logoBase64,
  });

  y = drawProKpiCards(doc, ml, y, w, kpiStrip(kpis, ctx.options.inclurePoints));
  y = drawProLegend(doc, ml, y, w);

  const bottomLimit = pageH - PRO_MARGINS.bottom - 12;

  if (rows.length === 1 && ctx.typePdf !== "E") {
    y = drawJoueurRowBanner(doc, ml, y, w, rows[0]!, ctx.options.inclurePoints);
  }

  if (useMonths) {
    if (y < bottomLimit - 40) {
      y = drawMonthlyHeatmap(doc, ml, y, w, ctx.dateDebut, ctx.dateFin, rows);
    }
  } else if (y < bottomLimit - 40) {
    y = drawWeeklyPlanningMatrix(doc, ml, y, w, ctx.dateDebut, ctx.dateFin, rows);
  }

  if (y < bottomLimit - 30) {
    drawProSyntheseTable(doc, ml, y + 2, w, allEvents, {
      includeResultats: ctx.options.inclureResultats,
      includePoints: ctx.options.inclurePoints,
      includePrize: ctx.options.inclurePrizeMoney,
    });
  }
}

/** Type A — Planning mensuel */
export function generateTypeA(ctx: ProgrammationPdfContext): jsPDF {
  const doc = newLandscapeDoc();
  const rows = buildJoueurRows(ctx);
  const allEvs = rows.flatMap((r) => r.events);
  addPlanningPage(doc, ctx, typePdfTitle("A"), rows, allEvs, false, false);
  drawProFooter(doc);
  return doc;
}

/** Type B — Planning trimestriel (3 blocs mensuels) */
export function generateTypeB(ctx: ProgrammationPdfContext): jsPDF {
  const doc = newLandscapeDoc();
  const rows = buildJoueurRows(ctx);
  const start = startOfQuarter(parseISO(ctx.dateDebut.slice(0, 10)));
  const end = endOfQuarter(parseISO(ctx.dateFin.slice(0, 10)));

  let month = start;
  let first = true;
  while (month <= end) {
    const mEnd = endOfMonth(month);
    const d0 = format(month, "yyyy-MM-dd");
    const d1 = format(mEnd, "yyyy-MM-dd");
    const monthRows = rows.map((r) => ({
      ...r,
      events: r.events.filter(
        (e) => e.date_fin >= d0 && e.date_debut <= d1
      ),
    }));
    const evs = monthRows.flatMap((r) => r.events);
    const title = `Planning trimestriel — ${format(month, "MMMM yyyy", { locale: fr })}`;
    addPlanningPage(doc, { ...ctx, dateDebut: d0, dateFin: d1 }, title, monthRows, evs, false, !first);
    month = addMonths(month, 1);
    first = false;
  }

  const pageW = doc.internal.pageSize.getWidth();
  const ml = PRO_MARGINS.left;
  const w = contentWidth(doc);
  doc.addPage();
  let y = drawProHeader(doc, {
    pageW,
    title: "Récapitulatif trimestriel",
    subtitle: formatPeriodePdf(ctx.dateDebut, ctx.dateFin),
    generatedBy: ctx.generatedBy,
    logo: ctx.logoBase64,
  });
  drawComparatifTable(doc, ml, y + 4, w, rows);
  drawProFooter(doc);
  return doc;
}

/** Type C — Planning annuel */
export function generateTypeC(ctx: ProgrammationPdfContext): jsPDF {
  const doc = newLandscapeDoc();
  const rows = buildJoueurRows(ctx);
  const allEvs = rows.flatMap((r) => r.events);
  const year = parseISO(ctx.dateDebut.slice(0, 10)).getFullYear();
  addPlanningPage(
    doc,
    ctx,
    `Planning annuel ${year}`,
    rows,
    allEvs,
    true,
    false
  );

  const pageW = doc.internal.pageSize.getWidth();
  const ml = PRO_MARGINS.left;
  const w = contentWidth(doc);
  doc.addPage();
  let y = drawProHeader(doc, {
    pageW,
    title: "Synthèse annuelle",
    subtitle: formatPeriodePdf(ctx.dateDebut, ctx.dateFin),
    generatedBy: ctx.generatedBy,
    logo: ctx.logoBase64,
  });
  drawComparatifTable(doc, ml, y + 4, w, rows);
  drawProFooter(doc);
  return doc;
}

/** Type D — Fiche individuelle (portrait) */
export function generateTypeD(ctx: ProgrammationPdfContext): jsPDF {
  const doc = newPortraitDoc();
  const rows = buildJoueurRows(ctx);
  const row = rows[0] ?? {
    id: ctx.joueurIds[0] ?? "",
    label: "Joueur",
    events: ctx.evenements,
  };
  const kpis = computeKpis(row.events);
  const pageW = doc.internal.pageSize.getWidth();
  const ml = PRO_MARGINS.left;
  const w = contentWidth(doc);

  let y = drawFicheIdentite(doc, row, kpis, ctx.dateDebut, ctx.dateFin, ctx.logoBase64);
  y = drawRankingBars(doc, ml, y, w, row.events);

  doc.addPage();
  y = drawProHeader(doc, {
    pageW,
    title: "Programme détaillé",
    subtitle: formatPeriodePdf(ctx.dateDebut, ctx.dateFin),
    generatedBy: ctx.generatedBy,
    logo: ctx.logoBase64,
  });
  drawProSyntheseTable(doc, ml, y + 2, w, row.events, {
    includeResultats: ctx.options.inclureResultats,
    includePoints: ctx.options.inclurePoints,
    includePrize: ctx.options.inclurePrizeMoney,
  });

  drawProFooter(doc);
  return doc;
}

/** Type E — Rapport multi-joueurs comparatif */
export function generateTypeE(ctx: ProgrammationPdfContext): jsPDF {
  const doc = newLandscapeDoc();
  const rows = buildJoueurRows(ctx);
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  drawCoverPage(doc, {
    pageW,
    pageH,
    title: "Rapport programmation",
    subtitle: typePdfTitle("E"),
    periode: formatPeriodePdf(ctx.dateDebut, ctx.dateFin),
    joueurs: rows,
    logo: ctx.logoBase64,
  });

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!;
    doc.addPage();
    const kpis = computeKpis(row.events);
    const ml = PRO_MARGINS.left;
    const w = contentWidth(doc);
    let y = drawProHeader(doc, {
      pageW,
      title: row.label,
      subtitle: formatPeriodePdf(ctx.dateDebut, ctx.dateFin),
      generatedBy: ctx.generatedBy,
      logo: ctx.logoBase64,
    });
    y = drawProKpiCards(doc, ml, y, w, kpiStrip(kpis, ctx.options.inclurePoints));
    if (y < pageH - 50) {
      drawWeeklyPlanningMatrix(doc, ml, y, w, ctx.dateDebut, ctx.dateFin, [row], 40, 12);
    }
  }

  doc.addPage();
  const ml = PRO_MARGINS.left;
  const w = contentWidth(doc);
  let y = drawProHeader(doc, {
    pageW,
    title: "Comparatif équipe",
    subtitle: formatPeriodePdf(ctx.dateDebut, ctx.dateFin),
    generatedBy: ctx.generatedBy,
    logo: ctx.logoBase64,
  });
  drawComparatifTable(doc, ml, y + 4, w, rows);
  drawProFooter(doc);
  return doc;
}
