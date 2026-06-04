import "server-only";

import { jsPDF } from "jspdf";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import {
  drawCalendarProHeader,
  drawColorLegend,
  drawEventsAgenda,
  drawJoueurStrip,
  drawMonthCalendarGrid,
  monthsInRange,
} from "@/lib/programmation-joueurs/pdf-calendar-draw.server";
import {
  PDF_CALENDAR_THEME,
  PROGRAMMATION_TYPE_SHORT,
  typeColorRgb,
} from "@/lib/programmation-joueurs/pdf-calendar-theme";
import { PROGRAMMATION_TYPE_LABELS } from "@/lib/constants/programmation-joueurs";
import { loadPdfLogoBase64 } from "@/lib/pdf/load-pdf-logo";
import { formatDateTablePdf, formatPeriodePdf } from "@/lib/pdf/pdf-format";
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
    doc.setFillColor(...PDF_CALENDAR_THEME.headerSub);
    doc.rect(0, pageH - 5, pageW, 0.4, "F");
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...PDF_CALENDAR_THEME.muted);
    doc.text(PDF_META.author, PDF_SIZES.marginLeft, pageH - 2);
    doc.text(`Page ${i} / ${total}`, pageW - PDF_SIZES.marginRight, pageH - 2, { align: "right" });
  }
}

function renderJoueurCalendarPages(
  doc: jsPDF,
  params: ProgrammationPdfParams,
  joueurId: string,
  logo?: string,
  addPageBefore = false
) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const { marginLeft, marginRight } = PDF_SIZES;
  const contentW = pageW - marginLeft - marginRight;

  const evs = eventsForJoueur(params.evenements, joueurId, params.dateDebut, params.dateFin);
  const sample = evs[0] ?? params.evenements.find((e) => e.joueur_id === joueurId);
  const label = sample ? joueurLabel(sample) : joueurId.slice(0, 8);
  const months = monthsInRange(params.dateDebut, params.dateFin);

  if (addPageBefore) doc.addPage();

  for (let mi = 0; mi < months.length; mi++) {
    if (mi > 0) doc.addPage();

    const month = months[mi]!;
    const monthTitle = `Calendrier ${format(month, "MMMM yyyy", { locale: fr })}`;

    let y = drawCalendarProHeader(doc, {
      pageW,
      marginLeft,
      marginRight,
      title: monthTitle,
      subtitle: formatPeriodePdf(params.dateDebut, params.dateFin),
      generatedBy: params.generatedBy ?? "Staff FRMT",
      logo,
    });

    y = drawJoueurStrip(doc, marginLeft, y, contentW, label, {
      categorie: sample?.joueur_categorie,
      classement: params.includeClassement ? sample?.joueur_classement : null,
    });

    y = drawColorLegend(doc, marginLeft, y, contentW);
    y += 2;

    y = drawMonthCalendarGrid({
      doc,
      x: marginLeft,
      y,
      width: contentW,
      month,
      events: evs,
      compact: false,
      maxEventsPerDay: 4,
    });

    if (y < pageH - 55) {
      drawEventsAgenda(doc, marginLeft, y + 2, contentW, evs, params.includeResultats);
    }

    const tournois = evs.filter((e) => e.type.includes("tournoi") || e.type.includes("cup")).length;
    const stages = evs.filter((e) => e.type.startsWith("stage")).length;
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7);
    doc.setTextColor(...PDF_CALENDAR_THEME.muted);
    doc.text(
      `Recap periode : ${tournois} tournoi(s) · ${stages} stage(s) · ${evs.length} evenement(s)`,
      marginLeft,
      pageH - 8
    );
  }
}

/** Vue annuelle : 12 mini-calendriers sur pages paysage (3 x 4) */
function renderAnnuelCalendar(doc: jsPDF, params: ProgrammationPdfParams, logo?: string) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const { marginLeft, marginRight } = PDF_SIZES;
  const contentW = pageW - marginLeft - marginRight;

  let started = false;
  for (const jid of params.joueurIds) {
    if (started) doc.addPage();
    started = true;

    const evs = eventsForJoueur(params.evenements, jid, params.dateDebut, params.dateFin);
    const sample = evs[0] ?? params.evenements.find((e) => e.joueur_id === jid);
    const label = sample ? joueurLabel(sample) : jid.slice(0, 8);
    const year = parseISO(params.dateDebut.slice(0, 10)).getFullYear();
    const months = Array.from({ length: 12 }, (_, i) => new Date(year, i, 1));

    let y = drawCalendarProHeader(doc, {
      pageW,
      marginLeft,
      marginRight,
      title: `Programme annuel ${year}`,
      subtitle: label,
      generatedBy: params.generatedBy ?? "Staff FRMT",
      logo,
    });

    y = drawJoueurStrip(doc, marginLeft, y, contentW, label, {
      categorie: sample?.joueur_categorie,
      classement: params.includeClassement ? sample?.joueur_classement : null,
    });
    y = drawColorLegend(doc, marginLeft, y, contentW);
    y += 2;

    const colW = contentW / 3;
    const startY = y;
    for (let i = 0; i < 12; i++) {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const mx = marginLeft + col * colW;
      const my = startY + row * 52;
      drawMonthCalendarGrid({
        doc,
        x: mx,
        y: my,
        width: colW - 2,
        month: months[i]!,
        events: evs,
        compact: true,
        maxEventsPerDay: 1,
      });
    }
  }
}

/** Comparatif multi-joueurs : timeline hebdo coloree */
function renderMultiCalendar(doc: jsPDF, params: ProgrammationPdfParams, logo?: string) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const { marginLeft, marginRight } = PDF_SIZES;
  const contentW = pageW - marginLeft - marginRight;

  let y = drawCalendarProHeader(doc, {
    pageW,
    marginLeft,
    marginRight,
    title: "Comparatif multi-joueurs",
    subtitle: formatPeriodePdf(params.dateDebut, params.dateFin),
    generatedBy: params.generatedBy ?? "Staff FRMT",
    logo,
  });

  y = drawColorLegend(doc, marginLeft, y, contentW);
  y += 4;

  const labels = params.joueurIds.map((jid) => {
    const sample = params.evenements.find((e) => e.joueur_id === jid);
    return sample ? joueurLabel(sample) : jid.slice(0, 8);
  });

  const rowH = 10;
  const labelW = 38;
  const gridW = contentW - labelW;
  const start = parseISO(params.dateDebut.slice(0, 10));
  const end = parseISO(params.dateFin.slice(0, 10));
  const totalDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1);
  const dayW = gridW / Math.min(totalDays, 90);

  doc.setFillColor(...PDF_CALENDAR_THEME.weekdayBg);
  doc.rect(marginLeft + labelW, y, gridW, 6, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6);
  doc.setTextColor(255, 255, 255);
  doc.text("Timeline periode", marginLeft + labelW + 2, y + 4);

  y += 6;

  for (let ji = 0; ji < params.joueurIds.length; ji++) {
    const jid = params.joueurIds[ji]!;
    const jy = y + ji * rowH;
    doc.setFillColor(248, 250, 252);
    doc.rect(marginLeft, jy, labelW, rowH, "F");
    doc.setDrawColor(...PDF_CALENDAR_THEME.cellBorder);
    doc.rect(marginLeft + labelW, jy, gridW, rowH);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(30, 41, 59);
    doc.text(labels[ji]!.slice(0, 22), marginLeft + 2, jy + 6);

    const evs = eventsForJoueur(params.evenements, jid, params.dateDebut, params.dateFin);
    for (const ev of evs) {
      const d0 = parseISO(ev.date_debut.slice(0, 10));
      const d1 = parseISO(ev.date_fin.slice(0, 10));
      const offset = Math.max(0, Math.floor((d0.getTime() - start.getTime()) / 86400000));
      const span = Math.max(1, Math.floor((d1.getTime() - d0.getTime()) / 86400000) + 1);
      const [r, g, b] = typeColorRgb(ev.type);
      doc.setFillColor(r, g, b);
      const bx = marginLeft + labelW + offset * dayW;
      const bw = Math.max(dayW * 0.8, span * dayW - 0.5);
      doc.roundedRect(bx, jy + 1.5, Math.min(bw, gridW - offset * dayW), rowH - 3, 0.5, 0.5, "F");
      doc.setFontSize(5);
      doc.setTextColor(255, 255, 255);
      doc.text(PROGRAMMATION_TYPE_SHORT[ev.type], bx + 1, jy + 6);
    }
  }

  y += params.joueurIds.length * rowH + 8;
  if (y < pageH - 40) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(51, 65, 85);
    doc.text("Synthese", marginLeft, y);
    y += 4;
    for (const jid of params.joueurIds) {
      const evs = eventsForJoueur(params.evenements, jid, params.dateDebut, params.dateFin);
      const sample = evs[0];
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      doc.text(
        `${sample ? joueurLabel(sample) : jid} : ${evs.length} evt — ${[...new Set(evs.map((e) => PROGRAMMATION_TYPE_LABELS[e.type]))].slice(0, 4).join(", ")}`,
        marginLeft,
        y
      );
      y += 4;
    }
  }
}

export async function generateProgrammationPdfBuffer(
  params: ProgrammationPdfParams
): Promise<Uint8Array> {
  const logo = await loadPdfLogoBase64();
  const useLandscape = true;
  const doc = new jsPDF({ orientation: useLandscape ? "landscape" : "portrait", unit: "mm", format: "a4" });

  doc.setProperties({
    title: "Programme joueurs FRMT",
    creator: PDF_META.creator,
    author: PDF_META.author,
  });

  switch (params.typePdf) {
    case "annuel":
      renderAnnuelCalendar(doc, params, logo);
      break;
    case "multi":
      renderMultiCalendar(doc, params, logo);
      break;
    case "plage":
    case "mensuel":
    default:
      for (let i = 0; i < params.joueurIds.length; i++) {
        renderJoueurCalendarPages(doc, params, params.joueurIds[i]!, logo, i > 0);
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
