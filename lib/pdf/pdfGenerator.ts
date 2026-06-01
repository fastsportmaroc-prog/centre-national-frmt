import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { getOfficialLogoDataUri } from "@/lib/brand/print-logo";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

// ── PALETTE OFFICIELLE FRMT (rouge, vert, blanc, gris) ──
export const FRMT = {
  /** @deprecated Utiliser green — conservé pour compat catégories */
  navyBlue: [0, 98, 51] as [number, number, number],
  gold: [201, 31, 46] as [number, number, number],
  red: [201, 31, 46] as [number, number, number],
  green: [0, 107, 63] as [number, number, number],
  greenDark: [0, 77, 40] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  cream: [245, 247, 250] as [number, number, number],
  mint: [245, 247, 250] as [number, number, number],
  lightGray: [245, 247, 250] as [number, number, number],
  midGray: [45, 55, 72] as [number, number, number],
  darkGray: [45, 55, 72] as [number, number, number],
  borderGray: [229, 231, 235] as [number, number, number],
  categories: {
    U10: [244, 114, 182] as [number, number, number],
    U12: [56, 189, 248] as [number, number, number],
    U14: [74, 222, 128] as [number, number, number],
    U16: [251, 146, 60] as [number, number, number],
    U18: [167, 139, 250] as [number, number, number],
    Junior: [45, 212, 191] as [number, number, number],
    Senior: [26, 60, 94] as [number, number, number],
    Élite: [0, 107, 63] as [number, number, number],
    Elite: [0, 107, 63] as [number, number, number],
    National: [239, 68, 68] as [number, number, number],
    Mixte: [148, 163, 184] as [number, number, number],
  },
};

export type PdfColumnDef = {
  header: string;
  key: string;
  width?: number;
  align?: "left" | "center" | "right";
};

export type PdfSectionDef = {
  title: string;
  columns: PdfColumnDef[];
  data: Record<string, unknown>[];
};

export type PDFConfig = {
  title: string;
  subtitle?: string;
  periode?: string;
  columns?: PdfColumnDef[];
  data?: Record<string, unknown>[];
  sections?: PdfSectionDef[];
  showSignataires?: boolean;
  orientation?: "portrait" | "landscape";
  filename?: string;
  extraSections?: { title: string; content: string }[];
  categorieColor?: number[];
  footerNote?: string;
  customBody?: (doc: jsPDF, pageW: number, pageH: number, startY: number) => number;
  generatedBy?: string;
  appVersion?: string;
};

/** @deprecated compat */
export type PdfColumn<T extends Record<string, unknown> = Record<string, unknown>> = {
  header: string;
  key: keyof T & string;
  width?: number;
};

/** @deprecated compat */
export type PdfSection<T extends Record<string, unknown> = Record<string, unknown>> = {
  heading?: string;
  columns: PdfColumn<T>[];
  data: T[];
};

/** @deprecated compat */
export type GeneratePdfOptions<T extends Record<string, unknown> = Record<string, unknown>> = {
  title: string;
  subtitle?: string;
  columns?: PdfColumn<T>[];
  data?: T[];
  sections?: PdfSection[];
  showSignataires?: boolean;
  signatairesDateLieu?: string;
  orientation?: "portrait" | "landscape";
  filename?: string;
  footerNote?: string;
  customBody?: (doc: jsPDF, pageW: number, pageH: number, startY: number) => number;
};

type DocWithTable = jsPDF & { lastAutoTable?: { finalY: number } };

function getFRMTLogo(): string {
  try {
    return getOfficialLogoDataUri();
  } catch {
    return "";
  }
}

export function getCategoryPdfColor(categorie?: string): number[] {
  if (!categorie) return FRMT.green;
  const key = categorie as keyof typeof FRMT.categories;
  return FRMT.categories[key] ?? FRMT.green;
}

const HEADER_H = 46;

function drawFrmtBands(doc: jsPDF, pW: number, y: number, h = 2.5) {
  const half = pW / 2;
  doc.setFillColor(...FRMT.red);
  doc.rect(0, y, half, h, "F");
  doc.setFillColor(...FRMT.green);
  doc.rect(half, y, half, h, "F");
}

function drawInstitutionalHeader(doc: jsPDF, pW: number, logo: string, generatedBy?: string) {
  drawFrmtBands(doc, pW, 0);

  doc.setFillColor(...FRMT.cream);
  doc.rect(0, 2.5, pW, HEADER_H, "F");

  if (logo) {
    try {
      doc.addImage(logo, "PNG", 14, 7, 34, 34);
    } catch {
      /* logo optionnel */
    }
  }

  const textX = logo ? 54 : 14;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...FRMT.green);
  const fedLines = doc.splitTextToSize("FÉDÉRATION ROYALE MAROCAINE DE TENNIS", pW - textX - 14);
  doc.text(fedLines, textX, 14);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...FRMT.darkGray);
  doc.text("CENTRE NATIONAL", textX, 20);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...FRMT.midGray);
  if (generatedBy) {
    doc.text(`GÉNÉRÉ PAR ${generatedBy}`, pW - 14, HEADER_H - 6, { align: "right" });
  }
  doc.text(
    `GÉNÉRÉ LE ${format(new Date(), "dd MMMM yyyy", { locale: fr }).toLocaleUpperCase("fr-FR")}`,
    pW - 14,
    HEADER_H - 2,
    { align: "right" }
  );

  doc.setFillColor(...FRMT.green);
  doc.rect(0, 2.5 + HEADER_H, pW, 1.2, "F");
  doc.setFillColor(...FRMT.red);
  doc.rect(0, 3.7 + HEADER_H, pW, 0.6, "F");
}

function drawPageFooter(
  doc: jsPDF,
  pW: number,
  pH: number,
  pageNumber: number,
  totalPages: number,
  logo: string,
  footerNote?: string,
  appVersion?: string
) {
  const footerH = 12;
  const y0 = pH - footerH;

  drawFrmtBands(doc, pW, y0 - 2.5, 1.2);

  doc.setFillColor(...FRMT.green);
  doc.rect(0, y0, pW, footerH, "F");

  doc.setTextColor(...FRMT.white);
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "normal");
  doc.text(
    footerNote ?? "Document confidentiel — Fédération Royale Marocaine de Tennis",
    pW / 2,
    y0 + 5.5,
    { align: "center" }
  );
  doc.setFont("helvetica", "bold");
  doc.text(`Page ${pageNumber} / ${totalPages}`, pW - 14, y0 + 5.5, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.text(`${format(new Date(), "dd/MM/yyyy HH:mm", { locale: fr })} • ${appVersion ?? "v2"}`, pW / 2, y0 + 9.5, {
    align: "center",
  });

  if (logo) {
    try {
      doc.addImage(logo, "PNG", 14, y0 + 2, 8, 8);
    } catch {
      /* ignore */
    }
  }
}

function addFrmtTable(
  doc: DocWithTable,
  startY: number,
  columns: PdfColumnDef[],
  data: Record<string, unknown>[],
  margin: number,
  pW: number,
  pH: number,
  logo: string,
  footerNote: string | undefined,
  categorieColor?: number[]
) {
  autoTable(doc, {
    startY,
    head: [columns.map((c) => c.header)],
    body: data.map((row) =>
      columns.map((c) => {
        const val = row[c.key];
        return val !== null && val !== undefined ? String(val) : "—";
      })
    ),
    theme: "plain",
    headStyles: {
      fillColor: FRMT.green,
      textColor: FRMT.white,
      fontStyle: "bold",
      fontSize: 8,
      halign: "center",
      cellPadding: { top: 5, bottom: 5, left: 4, right: 4 },
      lineWidth: 0,
    },
    bodyStyles: {
      fontSize: 8,
      cellPadding: { top: 3, bottom: 3, left: 3, right: 3 },
      textColor: FRMT.darkGray,
      lineColor: FRMT.borderGray,
      lineWidth: 0.2,
    },
    alternateRowStyles: { fillColor: FRMT.lightGray },
    columnStyles: columns.reduce(
      (acc, col, i) => {
        const halign = (col.align ?? (i === 0 ? "left" : "center")) as "left" | "center" | "right";
        acc[i] = {
          halign,
          cellWidth: col.width || "auto",
        };
        return acc;
      },
      {} as Record<number, { halign: "left" | "center" | "right"; cellWidth: number | "auto" }>
    ),
    didParseCell: (hookData) => {
      if (
        hookData.section === "body" &&
        hookData.row.index === data.length - 1 &&
        data[data.length - 1]?._isTotal
      ) {
        hookData.cell.styles.fontStyle = "bold";
        hookData.cell.styles.fillColor = FRMT.mint;
        hookData.cell.styles.textColor = FRMT.greenDark;
        hookData.cell.styles.fontSize = 9;
      }
    },
    didDrawCell: (hookData) => {
      if (hookData.section === "body" && categorieColor) {
        doc.setFillColor(categorieColor[0], categorieColor[1], categorieColor[2]);
        doc.rect(hookData.cell.x, hookData.cell.y, 1.5, hookData.cell.height, "F");
      }
    },
    margin: { left: margin, right: margin },
    rowPageBreak: "avoid",
    didDrawPage: (hookData) => {
      const total = doc.getNumberOfPages();
      drawPageFooter(doc, pW, pH, hookData.pageNumber, total, logo, footerNote);
    },
  });
}

function drawSignatairesBlock(doc: jsPDF, pW: number, _pH: number, sigY: number) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...FRMT.green);
  doc.text("SIGNATURES ET APPROBATION", pW / 2, sigY, { align: "center" });
  doc.setDrawColor(...FRMT.gold);
  doc.setLineWidth(0.8);
  doc.line(14, sigY + 3, pW - 14, sigY + 3);
  doc.setDrawColor(...FRMT.red);
  doc.setLineWidth(0.3);
  doc.line(14, sigY + 4.2, pW - 14, sigY + 4.2);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(...FRMT.midGray);
  doc.text(`Le ${format(new Date(), "dd MMMM yyyy", { locale: fr })}`, pW / 2, sigY + 10, {
    align: "center",
  });

  const sig1X = 27;
  const sig2X = pW - 87;
  const boxY = sigY + 15;

  for (const [x, title, name, titleLines] of [
    [sig1X, "Directeur Technique National", "KHALID AFIF", 1] as const,
    [sig2X, "Resp. Commission Développement", "CHAFIK SADER", 2] as const,
  ]) {
    doc.setFillColor(...FRMT.cream);
    doc.roundedRect(x - 5, boxY, 70, 45, 2, 2, "F");
    doc.setDrawColor(...FRMT.green);
    doc.setLineWidth(0.4);
    doc.roundedRect(x - 5, boxY, 70, 45, 2, 2, "S");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(titleLines === 2 ? 7.5 : 8.5);
    doc.setTextColor(...FRMT.greenDark);
    if (titleLines === 2) {
      doc.text("Resp. Commission Développement", x + 30, boxY + 8, { align: "center" });
      doc.text("et du Haut Niveau", x + 30, boxY + 14, { align: "center" });
    } else {
      doc.text(title, x + 30, boxY + 8, { align: "center" });
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...FRMT.darkGray);
    doc.text(name, x + 30, boxY + (titleLines === 2 ? 20 : 15), { align: "center" });
    doc.setFillColor(...FRMT.lightGray);
    doc.rect(x, boxY + 20, 60, 18, "F");
    doc.setFontSize(6.5);
    doc.setTextColor(...FRMT.midGray);
    doc.text("Signature & Cachet", x + 30, boxY + 31, { align: "center" });
  }
}

export async function generateFRMTPDF(config: PDFConfig): Promise<void> {
  const {
    title,
    subtitle,
    periode,
    columns = [],
    data = [],
    sections = [],
    showSignataires = false,
    orientation = "portrait",
    filename = "document.pdf",
    extraSections = [],
    categorieColor,
    generatedBy,
    appVersion,
  } = config;

  const doc = new jsPDF({ orientation, unit: "mm", format: "a4" }) as DocWithTable;
  const pW = doc.internal.pageSize.getWidth();
  const pH = doc.internal.pageSize.getHeight();
  const margin = 12;
  const logo = getFRMTLogo();

  drawInstitutionalHeader(doc, pW, logo, generatedBy);

  let cursorY = 2.5 + HEADER_H + 8;

  doc.setFillColor(...FRMT.mint);
  doc.roundedRect(margin, cursorY, pW - margin * 2, 16, 2, 2, "F");
  const accentColor = (categorieColor ?? FRMT.red) as [number, number, number];
  doc.setFillColor(...accentColor);
  doc.rect(margin, cursorY, 3, 16, "F");

  doc.setTextColor(...FRMT.greenDark);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(title.toUpperCase(), margin + 8, cursorY + 10);
  cursorY += 20;

  if (subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...FRMT.darkGray);
    const subLines = doc.splitTextToSize(subtitle, pW - margin * 2);
    doc.text(subLines, pW / 2, cursorY + 5, { align: "center" });
    cursorY += subLines.length * 4.5 + 6;
  }

  if (periode) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(...FRMT.midGray);
    doc.text(periode, pW / 2, cursorY + 4, { align: "center" });
    cursorY += 9;
  }

  doc.setDrawColor(...FRMT.borderGray);
  doc.setLineWidth(0.8);
  doc.line(margin, cursorY + 2, pW - margin, cursorY + 2);
  cursorY += 8;

  for (const section of extraSections) {
    if (!section.title && !section.content) continue;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...FRMT.green);
    if (section.title) {
      doc.text(section.title.toUpperCase(), margin, cursorY + 4);
      doc.setDrawColor(...FRMT.borderGray);
      doc.setLineWidth(0.6);
      doc.line(margin, cursorY + 6, margin + 40, cursorY + 6);
    }
    cursorY += section.title ? 7 : 0;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...FRMT.darkGray);
    const lines = doc.splitTextToSize(section.content, pW - margin * 2);
    doc.text(lines, margin, cursorY + 2);
    cursorY += lines.length * 4.5 + 4;
  }

  if (config.customBody) {
    cursorY = config.customBody(doc, pW, pH, cursorY) + 8;
  } else if (columns.length && data.length) {
    addFrmtTable(doc, cursorY, columns, data, margin, pW, pH, logo, config.footerNote, categorieColor);
    cursorY = (doc.lastAutoTable?.finalY ?? cursorY) + 8;
  }

  for (const sec of sections) {
    if (sec.title) {
      if (cursorY > pH - 50) {
        doc.addPage();
        drawInstitutionalHeader(doc, pW, logo, generatedBy);
        cursorY = 2.5 + HEADER_H + 14;
      }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...FRMT.green);
      doc.text(sec.title.toUpperCase(), margin, cursorY + 4);
      doc.setDrawColor(...FRMT.borderGray);
      doc.setLineWidth(0.6);
      doc.line(margin, cursorY + 6, margin + 36, cursorY + 6);
      cursorY += 8;
    }
    if (sec.columns.length && sec.data.length) {
      addFrmtTable(
        doc,
        cursorY,
        sec.columns,
        sec.data,
        margin,
        pW,
        pH,
        logo,
        config.footerNote,
        categorieColor
      );
      cursorY = (doc.lastAutoTable?.finalY ?? cursorY) + 8;
    }
  }

  if (showSignataires) {
    let sigY = cursorY + 12;
    if (sigY > pH - 70) {
      doc.addPage();
      drawInstitutionalHeader(doc, pW, logo, generatedBy);
      sigY = 2.5 + HEADER_H + 14;
    }
    drawSignatairesBlock(doc, pW, pH, sigY);
  }

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawPageFooter(doc, pW, pH, i, totalPages, logo, config.footerNote, appVersion);
  }

  const out = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
  doc.save(out);
}

function mapLegacyToConfig<T extends Record<string, unknown>>(
  opts: GeneratePdfOptions<T> & { filename: string }
): PDFConfig {
  return {
    title: opts.title,
    subtitle: opts.subtitle,
    columns: opts.columns?.map((c) => ({
      header: c.header,
      key: c.key,
      width: c.width,
    })),
    data: (opts.data ?? []) as Record<string, unknown>[],
    sections: opts.sections?.map((s) => ({
      title: s.heading ?? "",
      columns: s.columns.map((c) => ({ header: c.header, key: c.key, width: c.width })),
      data: s.data as Record<string, unknown>[],
    })),
    showSignataires: opts.showSignataires,
    orientation: opts.orientation,
    filename: opts.filename,
    footerNote: opts.footerNote,
    customBody: opts.customBody,
  };
}

export async function generatePDF<T extends Record<string, unknown>>(
  opts: GeneratePdfOptions<T> & { filename?: string }
): Promise<jsPDF> {
  const filename = opts.filename ?? "document.pdf";
  await generateFRMTPDF({ ...mapLegacyToConfig({ ...opts, filename }), filename });
  return new jsPDF();
}

export function savePDF<T extends Record<string, unknown>>(
  opts: GeneratePdfOptions<T> & { filename: string }
): void {
  void generateFRMTPDF(mapLegacyToConfig(opts)).catch((e) => {
    console.error("[PDF] export failed:", e);
  });
}
