import "server-only";

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  eachDayOfInterval,
  endOfMonth,
  format,
  parseISO,
  startOfMonth,
} from "date-fns";
import { fr } from "date-fns/locale";
import {
  PROGRAMMATION_SURFACE_LABELS,
  PROGRAMMATION_TYPE_LABELS,
} from "@/lib/constants/programmation-joueurs";
import { loadPdfLogoBase64 } from "@/lib/pdf/load-pdf-logo";
import {
  formatDateFR,
  formatDateTablePdf,
  formatPeriodePdf,
  safePdfCell,
} from "@/lib/pdf/pdf-format";
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

type DocWithTable = jsPDF & { lastAutoTable?: { finalY: number } };

function joueurLabel(e: ProgrammationEvenementEnriched): string {
  const name = [e.joueur_prenom, e.joueur_nom].filter(Boolean).join(" ");
  return name || e.joueur_id.slice(0, 8);
}

function drawHeader(
  doc: jsPDF,
  title: string,
  subtitle: string,
  generatedBy: string,
  logo?: string
): number {
  const pageW = doc.internal.pageSize.getWidth();
  const { marginLeft, marginRight } = PDF_SIZES;
  let y = PDF_SIZES.marginTop;

  if (logo?.startsWith("data:")) {
    try {
      doc.addImage(logo, "PNG", marginLeft, y, 22, 22);
    } catch {
      /* ignore */
    }
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(26, 60, 94);
  doc.text("Centre National FRMT", marginLeft + (logo ? 26 : 0), y + 6);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(74, 85, 104);
  doc.text(title, marginLeft + (logo ? 26 : 0), y + 12);
  doc.text(subtitle, marginLeft + (logo ? 26 : 0), y + 17);
  doc.text(`Généré le ${formatDateFR(new Date().toISOString())} · ${generatedBy}`, pageW - marginRight, y + 6, {
    align: "right",
  });
  doc.setFontSize(7);
  doc.setTextColor(197, 48, 48);
  doc.text("DOCUMENT CONFIDENTIEL — Usage interne", pageW - marginRight, y + 12, { align: "right" });

  doc.setDrawColor(0, 107, 63);
  doc.setLineWidth(0.6);
  doc.line(marginLeft, y + 24, pageW - marginRight, y + 24);
  return y + 30;
}

function drawFooter(doc: jsPDF) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(113, 128, 150);
    doc.text(PDF_META.author, PDF_SIZES.marginLeft, pageH - 8);
    doc.text(`Page ${i} / ${total}`, pageW - PDF_SIZES.marginRight, pageH - 8, { align: "right" });
  }
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

function buildMensuelRows(
  events: ProgrammationEvenementEnriched[],
  dateDebut: string,
  dateFin: string,
  includeResultats: boolean,
  includePoints: boolean
): string[][] {
  const start = parseISO(dateDebut.slice(0, 10));
  const end = parseISO(dateFin.slice(0, 10));
  const days = eachDayOfInterval({ start, end });
  const rows: string[][] = [];

  for (const day of days) {
    const iso = format(day, "yyyy-MM-dd");
    const dayEvents = events.filter((e) => e.date_debut <= iso && e.date_fin >= iso);
    if (!dayEvents.length) {
      rows.push([formatDateTablePdf(iso), "—", "—", "—", "—", "—"]);
      continue;
    }
    for (const ev of dayEvents) {
      const cols = [
        formatDateTablePdf(iso),
        safePdfCell(ev.nom),
        safePdfCell([ev.ville, ev.pays].filter(Boolean).join(", ")),
        safePdfCell(ev.pays),
        safePdfCell(ev.surface ? PROGRAMMATION_SURFACE_LABELS[ev.surface] : "—"),
        safePdfCell(ev.statut.replace("_", " ")),
      ];
      if (includeResultats) cols.push(safePdfCell(ev.resultat_simple));
      if (includePoints) cols.push(String(ev.points_gagnes ?? "—"));
      rows.push(cols);
    }
  }
  return rows;
}

function renderMensuelPlage(
  doc: DocWithTable,
  events: ProgrammationEvenementEnriched[],
  params: ProgrammationPdfParams,
  title: string,
  logo?: string
) {
  const { marginLeft, marginRight } = PDF_SIZES;
  const pageW = doc.internal.pageSize.getWidth();
  const contentW = pageW - marginLeft - marginRight;
  let y = drawHeader(
    doc,
    title,
    formatPeriodePdf(params.dateDebut, params.dateFin),
    params.generatedBy ?? "Staff FRMT",
    logo
  );

  const joueurGroups = [...new Set(params.joueurIds)];
  for (const jid of joueurGroups) {
    const evs = eventsForJoueur(events, jid, params.dateDebut, params.dateFin);
    const sample = evs[0] ?? events.find((e) => e.joueur_id === jid);
    const label = sample ? joueurLabel(sample) : jid.slice(0, 8);
    const classement =
      params.includeClassement && sample?.joueur_classement
        ? ` · Classement ${sample.joueur_classement}`
        : "";

    if (y > doc.internal.pageSize.getHeight() - 40) {
      doc.addPage();
      y = PDF_SIZES.marginTop;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(45, 55, 72);
    doc.text(`${label}${classement}`, marginLeft, y);
    y += 6;

    const headers = ["Jour", "Événement", "Lieu", "Pays", "Surface", "Statut"];
    if (params.includeResultats) headers.push("Résultat");
    if (params.includePoints) headers.push("Points");

    const rows = buildMensuelRows(
      evs,
      params.dateDebut,
      params.dateFin,
      Boolean(params.includeResultats),
      Boolean(params.includePoints)
    );

    autoTable(doc, {
      startY: y,
      margin: { left: marginLeft, right: marginRight },
      tableWidth: contentW,
      head: [headers],
      body: rows.length ? rows : [["—", "Aucun événement", "—", "—", "—", "—"]],
      styles: { fontSize: 7, cellPadding: 1.5 },
      headStyles: { fillColor: [45, 55, 72], textColor: 255 },
      alternateRowStyles: { fillColor: [247, 250, 252] },
    });
    y = (doc.lastAutoTable?.finalY ?? y) + 8;

    const tournois = evs.filter((e) => e.type.includes("tournoi") || e.type.includes("cup")).length;
    const stages = evs.filter((e) => e.type.startsWith("stage")).length;
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.text(`Récap : ${tournois} tournoi(s), ${stages} stage(s)`, marginLeft, y);
    y += 10;
  }
}

function renderAnnuel(
  doc: DocWithTable,
  events: ProgrammationEvenementEnriched[],
  params: ProgrammationPdfParams,
  logo?: string
) {
  const { marginLeft, marginRight } = PDF_SIZES;
  let y = drawHeader(
    doc,
    "Programme annuel",
    formatPeriodePdf(params.dateDebut, params.dateFin),
    params.generatedBy ?? "Staff FRMT",
    logo
  );

  for (const jid of params.joueurIds) {
    const evs = eventsForJoueur(events, jid, params.dateDebut, params.dateFin);
    const sample = evs[0] ?? events.find((e) => e.joueur_id === jid);
    const label = sample ? joueurLabel(sample) : jid.slice(0, 8);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(label, marginLeft, y);
    y += 5;

    const byMonth = new Map<string, ProgrammationEvenementEnriched[]>();
    for (const e of evs) {
      const m = e.date_debut.slice(0, 7);
      if (!byMonth.has(m)) byMonth.set(m, []);
      byMonth.get(m)!.push(e);
    }

    const rows = [...byMonth.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([m, list]) => {
        const d = parseISO(`${m}-01`);
        return [
          format(d, "MMMM yyyy", { locale: fr }),
          String(list.length),
          String(list.filter((e) => e.type.includes("tournoi")).length),
          String(list.filter((e) => e.type.startsWith("stage")).length),
          [...new Set(list.map((e) => e.pays).filter(Boolean))].join(", ") || "—",
        ];
      });

    autoTable(doc, {
      startY: y,
      margin: { left: marginLeft, right: marginRight },
      head: [["Mois", "Événements", "Tournois", "Stages", "Pays"]],
      body: rows.length ? rows : [["—", "0", "0", "0", "—"]],
      styles: { fontSize: 8 },
      headStyles: { fillColor: [45, 55, 72], textColor: 255 },
    });
    y = (doc.lastAutoTable?.finalY ?? y) + 10;

    const pays = [...new Set(evs.map((e) => e.pays).filter(Boolean))];
    const points = evs.reduce((s, e) => s + (e.points_gagnes ?? 0), 0);
    doc.setFontSize(8);
    doc.text(
      `Stats : ${pays.length} pays · ${points} pts · ${evs.length} événements`,
      marginLeft,
      y
    );
    y += 12;
    if (y > doc.internal.pageSize.getHeight() - 30) {
      doc.addPage();
      y = PDF_SIZES.marginTop;
    }
  }
}

function renderMulti(
  doc: DocWithTable,
  events: ProgrammationEvenementEnriched[],
  params: ProgrammationPdfParams,
  logo?: string
) {
  const { marginLeft, marginRight } = PDF_SIZES;
  let y = drawHeader(
    doc,
    "Comparatif multi-joueurs",
    formatPeriodePdf(params.dateDebut, params.dateFin),
    params.generatedBy ?? "Staff FRMT",
    logo
  );

  const labels = params.joueurIds.map((jid) => {
    const sample = events.find((e) => e.joueur_id === jid);
    return sample ? joueurLabel(sample) : jid.slice(0, 8);
  });

  const headers = ["Semaine", ...labels];
  const start = parseISO(params.dateDebut.slice(0, 10));
  const end = parseISO(params.dateFin.slice(0, 10));
  const rows: string[][] = [];
  let weekStart = start;
  while (weekStart <= end) {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const ws = format(weekStart, "yyyy-MM-dd");
    const we = format(weekEnd <= end ? weekEnd : end, "yyyy-MM-dd");
    const row = [`${formatDateTablePdf(ws)} - ${formatDateTablePdf(we)}`];
    for (const jid of params.joueurIds) {
      const evs = eventsForJoueur(events, jid, ws, we);
      row.push(
        evs.length
          ? evs.map((e) => PROGRAMMATION_TYPE_LABELS[e.type]?.slice(0, 12) ?? e.type).join(" | ")
          : "—"
      );
    }
    rows.push(row);
    weekStart = new Date(weekEnd);
    weekStart.setDate(weekStart.getDate() + 1);
  }

  autoTable(doc, {
    startY: y,
    margin: { left: marginLeft, right: marginRight },
    head: [headers],
    body: rows.slice(0, 52),
    styles: { fontSize: 6.5, cellPadding: 1.2 },
    headStyles: { fillColor: [45, 55, 72], textColor: 255 },
  });
}

export async function generateProgrammationPdfBuffer(
  params: ProgrammationPdfParams
): Promise<Uint8Array> {
  const logo = await loadPdfLogoBase64();
  const orientation = params.typePdf === "multi" ? "landscape" : "portrait";
  const doc = new jsPDF({ orientation, unit: "mm", format: "a4" }) as DocWithTable;

  doc.setProperties({
    title: "Programme joueurs FRMT",
    creator: PDF_META.creator,
    author: PDF_META.author,
  });

  switch (params.typePdf) {
    case "annuel":
      renderAnnuel(doc, params.evenements, params, logo);
      break;
    case "multi":
      renderMulti(doc, params.evenements, params, logo);
      break;
    case "plage":
      renderMensuelPlage(doc, params.evenements, params, "Programme sur période", logo);
      break;
    case "mensuel":
    default: {
      const d = parseISO(params.dateDebut.slice(0, 10));
      const title = `Programme du mois de ${format(d, "MMMM yyyy", { locale: fr })}`;
      renderMensuelPlage(doc, params.evenements, params, title, logo);
      break;
    }
  }

  drawFooter(doc);
  return new Uint8Array(doc.output("arraybuffer"));
}

/** Défaut période mensuelle si non fournie. */
export function defaultPdfDateRange(typePdf: ProgrammationPdfType, dateDebut?: string, dateFin?: string) {
  const now = new Date();
  if (dateDebut && dateFin) return { dateDebut: dateDebut.slice(0, 10), dateFin: dateFin.slice(0, 10) };
  if (typePdf === "annuel") {
    const y = now.getFullYear();
    return { dateDebut: `${y}-01-01`, dateFin: `${y}-12-31` };
  }
  const start = startOfMonth(now);
  const end = endOfMonth(now);
  return {
    dateDebut: format(start, "yyyy-MM-dd"),
    dateFin: format(end, "yyyy-MM-dd"),
  };
}
