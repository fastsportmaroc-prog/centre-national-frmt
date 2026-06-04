import "server-only";

import { jsPDF } from "jspdf";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import {
  buildMonthColumns,
  buildWeekColumns,
  computeEventKpis,
  drawEventSwimlanes,
  drawJoueurBanner,
  drawKpiStrip,
  drawPlanningGanttGrid,
  drawPlanningHero,
  drawPlanningLegend,
  drawPlanningRecapTable,
} from "@/lib/programmation-joueurs/pdf-planning-draw.server";
import { PDF_PLANNING_THEME } from "@/lib/programmation-joueurs/pdf-planning-theme";
import { loadPdfLogoBase64 } from "@/lib/pdf/load-pdf-logo";
import { formatPeriodePdf } from "@/lib/pdf/pdf-format";
import { PDF_META, PDF_SIZES } from "@/lib/pdf/pdfDesignSystem";
import type {
  ProgrammationEvenementEnriched,
  ProgrammationPdfType,
} from "@/lib/types/programmation-joueurs";

export type ProgrammationPdfParams = {
  evenements: ProgrammationEvenementEnriched[];
  joueurIds: string[];
  dateDebut: string;
  dateFin: string;
  typePdf: ProgrammationPdfType;
  generatedBy?: string;
  includeResultats?: boolean;
  includePoints?: boolean;
  includeClassement?: boolean;
};

function joueurLabel(e: ProgrammationEvenementEnriched): string {
  return [e.joueur_prenom, e.joueur_nom].filter(Boolean).join(" ") || e.joueur_id.slice(0, 8);
}

function eventsForJoueur(
  events: ProgrammationEvenementEnriched[],
  joueurId: string,
  dateDebut: string,
  dateFin: string
) {
  return events.filter(
    (e) =>
      e.joueur_id === joueurId &&
      e.date_fin >= dateDebut.slice(0, 10) &&
      e.date_debut <= dateFin.slice(0, 10)
  );
}

function drawFooter(doc: jsPDF) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFillColor(...PDF_PLANNING_THEME.accentGreen);
    doc.rect(0, pageH - 4, pageW, 0.5, "F");
    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...PDF_PLANNING_THEME.muted);
    doc.text(PDF_META.author, PDF_SIZES.marginLeft, pageH - 1.5);
    doc.text(`Page ${i}/${total}`, pageW - PDF_SIZES.marginRight, pageH - 1.5, { align: "right" });
  }
}

function renderJoueurPlanningPage(
  doc: jsPDF,
  params: ProgrammationPdfParams,
  joueurId: string,
  logo: string | undefined,
  addPageBefore: boolean,
  useMonths: boolean
) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const { marginLeft, marginRight } = PDF_SIZES;
  const contentW = pageW - marginLeft - marginRight;

  if (addPageBefore) doc.addPage();

  const evs = eventsForJoueur(params.evenements, joueurId, params.dateDebut, params.dateFin);
  const sample = evs[0] ?? params.evenements.find((e) => e.joueur_id === joueurId);
  const label = sample ? joueurLabel(sample) : joueurId.slice(0, 8);
  const kpis = computeEventKpis(evs);

  const title = useMonths
    ? `Planning annuel ${parseISO(params.dateDebut.slice(0, 10)).getFullYear()}`
    : `Planning ${format(parseISO(params.dateDebut.slice(0, 10)), "MMMM yyyy", { locale: fr })}`;

  let y = drawPlanningHero(doc, {
    pageW,
    marginLeft,
    marginRight,
    title,
    subtitle: formatPeriodePdf(params.dateDebut, params.dateFin),
    generatedBy: params.generatedBy ?? "Staff FRMT",
    logo,
  });

  y = drawKpiStrip(doc, marginLeft, y, contentW, [
    { label: "Tournois", value: kpis.tournois, color: PDF_PLANNING_THEME.kpiBlue },
    { label: "Stages", value: kpis.stages, color: PDF_PLANNING_THEME.kpiGreen },
    { label: "Sem. actives", value: kpis.semaines, color: PDF_PLANNING_THEME.kpiOrange },
    { label: "Pays", value: kpis.pays, color: PDF_PLANNING_THEME.kpiPurple },
  ]);

  y = drawJoueurBanner(doc, marginLeft, y, contentW, label, {
    categorie: sample?.joueur_categorie,
    classement: params.includeClassement ? sample?.joueur_classement : null,
  });

  y = drawPlanningLegend(doc, marginLeft, y, contentW);

  const allCols = useMonths
    ? buildMonthColumns(params.dateDebut, params.dateFin)
    : buildWeekColumns(params.dateDebut, params.dateFin);
  const rangeStart = parseISO(params.dateDebut.slice(0, 10));
  const chunkSize = useMonths ? 12 : 16;
  const colChunks: typeof allCols[] = [];
  for (let i = 0; i < allCols.length; i += chunkSize) {
    colChunks.push(allCols.slice(i, i + chunkSize));
  }
  if (!colChunks.length) colChunks.push([]);

  for (let ci = 0; ci < colChunks.length; ci++) {
    if (ci > 0) {
      doc.addPage();
      y = drawPlanningHero(doc, {
        pageW,
        marginLeft,
        marginRight,
        title: `${title} (${ci + 1}/${colChunks.length})`,
        subtitle: formatPeriodePdf(params.dateDebut, params.dateFin),
        generatedBy: params.generatedBy ?? "Staff FRMT",
        logo,
      });
      y = drawJoueurBanner(doc, marginLeft, y, contentW, label, {
        categorie: sample?.joueur_categorie,
        classement: params.includeClassement ? sample?.joueur_classement : null,
      });
      y = drawPlanningLegend(doc, marginLeft, y, contentW);
    }

    y = drawEventSwimlanes(doc, marginLeft, y, contentW, 42, colChunks[ci]!, evs, rangeStart);
  }

  if (y < pageH - 50 && colChunks.length === 1) {
    drawPlanningRecapTable(doc, marginLeft, y + 3, contentW, evs, params.includeResultats);
  }
}

function renderMultiPlanning(doc: jsPDF, params: ProgrammationPdfParams, logo?: string) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const { marginLeft, marginRight } = PDF_SIZES;
  const contentW = pageW - marginLeft - marginRight;

  const allEvs = params.joueurIds.flatMap((jid) =>
    eventsForJoueur(params.evenements, jid, params.dateDebut, params.dateFin)
  );
  const kpis = computeEventKpis(allEvs);

  let y = drawPlanningHero(doc, {
    pageW,
    marginLeft,
    marginRight,
    title: "Planning equipe — vue comparee",
    subtitle: formatPeriodePdf(params.dateDebut, params.dateFin),
    generatedBy: params.generatedBy ?? "Staff FRMT",
    logo,
  });

  y = drawKpiStrip(doc, marginLeft, y, contentW, [
    { label: "Joueurs", value: String(params.joueurIds.length), color: PDF_PLANNING_THEME.kpiPurple },
    { label: "Tournois", value: kpis.tournois, color: PDF_PLANNING_THEME.kpiBlue },
    { label: "Stages", value: kpis.stages, color: PDF_PLANNING_THEME.kpiGreen },
    { label: "Evenements", value: String(allEvs.length), color: PDF_PLANNING_THEME.kpiOrange },
  ]);

  y = drawPlanningLegend(doc, marginLeft, y, contentW);

  const cols = buildWeekColumns(params.dateDebut, params.dateFin);
  const rangeStart = parseISO(params.dateDebut.slice(0, 10));
  const labelW = 36;
  const rowH = 14;

  const rows = params.joueurIds.map((jid) => {
    const evs = eventsForJoueur(params.evenements, jid, params.dateDebut, params.dateFin);
    const sample = evs[0] ?? params.evenements.find((e) => e.joueur_id === jid);
    return {
      id: jid,
      label: sample ? joueurLabel(sample) : jid.slice(0, 8),
      sub: sample?.joueur_categorie ?? undefined,
      events: evs,
    };
  });

  y = drawPlanningGanttGrid({
    doc,
    x: marginLeft,
    y,
    width: contentW,
    labelWidth: labelW,
    rowHeight: rowH,
    cols,
    rangeStart,
    rows,
  });

  if (y < pageH - 40) {
    drawPlanningRecapTable(doc, marginLeft, y + 4, contentW, allEvs, params.includeResultats);
  }
}

function renderAnnuelPlanning(doc: jsPDF, params: ProgrammationPdfParams, logo?: string) {
  let started = false;
  for (const jid of params.joueurIds) {
    renderJoueurPlanningPage(doc, params, jid, logo, started, true);
    started = true;
  }
}

export async function generateProgrammationPdfBuffer(
  params: ProgrammationPdfParams
): Promise<Uint8Array> {
  const logo = await loadPdfLogoBase64();
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  doc.setProperties({
    title: "Planning joueurs FRMT",
    creator: PDF_META.creator,
    author: PDF_META.author,
  });

  switch (params.typePdf) {
    case "annuel":
      renderAnnuelPlanning(doc, params, logo);
      break;
    case "multi":
      renderMultiPlanning(doc, params, logo);
      break;
    case "plage":
    case "mensuel":
    default:
      for (let i = 0; i < params.joueurIds.length; i++) {
        renderJoueurPlanningPage(doc, params, params.joueurIds[i]!, logo, i > 0, false);
      }
      break;
  }

  drawFooter(doc);
  return new Uint8Array(doc.output("arraybuffer"));
}

export function defaultPdfDateRange(typePdf: ProgrammationPdfType, dateDebut?: string, dateFin?: string) {
  const now = new Date();
  if (dateDebut && dateFin) return { dateDebut: dateDebut.slice(0, 10), dateFin: dateFin.slice(0, 10) };
  if (typePdf === "annuel") {
    const y = now.getFullYear();
    return { dateDebut: `${y}-01-01`, dateFin: `${y}-12-31` };
  }
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    dateDebut: format(start, "yyyy-MM-dd"),
    dateFin: format(end, "yyyy-MM-dd"),
  };
}
