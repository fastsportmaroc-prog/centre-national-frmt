"use client";

import { jsPDF } from "jspdf";
import { PDF_COLORS, PDF_FONTS, PDF_META, PDF_SIZES } from "@/lib/pdf/pdfDesignSystem";

function hexRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function setFillHex(doc: jsPDF, hex: string) {
  const [r, g, b] = hexRgb(hex);
  doc.setFillColor(r, g, b);
}

function setTextHex(doc: jsPDF, hex: string) {
  const [r, g, b] = hexRgb(hex);
  doc.setTextColor(r, g, b);
}

function setDrawHex(doc: jsPDF, hex: string) {
  const [r, g, b] = hexRgb(hex);
  doc.setDrawColor(r, g, b);
}

export class FRMTPdfEngine {
  doc: jsPDF;
  currentY: number;
  pageNumber = 1;
  documentTitle: string;

  constructor(title: string, orientation: "portrait" | "landscape" = "portrait") {
    this.documentTitle = title;
    this.doc = new jsPDF({
      orientation,
      unit: "mm",
      format: "a4",
    });
    this.doc.setProperties({
      title,
      creator: PDF_META.creator,
      author: PDF_META.author,
      subject: PDF_META.subject,
    });
    this.currentY = PDF_SIZES.marginTop;
  }

  drawHeader(params: {
    stageName?: string;
    subtitle?: string;
    date?: string;
    documentType: string;
    logoBase64?: string;
  }) {
    const { marginLeft, marginRight, contentW, pageW } = PDF_SIZES;
    const doc = this.doc;

    setFillHex(doc, PDF_COLORS.primary);
    doc.rect(0, 0, pageW, 3, "F");

    if (params.logoBase64) {
      try {
        doc.addImage(params.logoBase64, "PNG", marginLeft, 5, 18, 18);
      } catch {
        /* logo optionnel */
      }
    }

    const textX = params.logoBase64 ? marginLeft + 22 : marginLeft;
    doc.setFont(PDF_FONTS.heading, "bold");
    doc.setFontSize(14);
    setTextHex(doc, PDF_COLORS.primary);
    doc.text("FRMT", textX, 11);
    doc.setFont(PDF_FONTS.body, "normal");
    doc.setFontSize(8);
    setTextHex(doc, PDF_COLORS.textSecondary);
    doc.text("Fédération Royale Marocaine de Tennis de Table", textX, 16);
    doc.text("Centre National d'Excellence — CNE V2", textX, 20);

    doc.setFont(PDF_FONTS.heading, "bold");
    doc.setFontSize(9);
    setTextHex(doc, PDF_COLORS.textPrimary);
    const typeW = doc.getTextWidth(params.documentType);
    doc.text(params.documentType, pageW - marginRight - typeW, 11);

    if (params.date) {
      doc.setFont(PDF_FONTS.body, "normal");
      doc.setFontSize(8);
      setTextHex(doc, PDF_COLORS.textMuted);
      const dateW = doc.getTextWidth(params.date);
      doc.text(params.date, pageW - marginRight - dateW, 16);
    }

    setDrawHex(doc, PDF_COLORS.tableBorder);
    doc.setLineWidth(0.3);
    doc.line(marginLeft, 25, pageW - marginRight, 25);

    setFillHex(doc, PDF_COLORS.bgAccent);
    doc.rect(marginLeft, 27, contentW, 12, "F");
    setDrawHex(doc, PDF_COLORS.primary);
    doc.setLineWidth(0.8);
    doc.line(marginLeft, 27, marginLeft, 39);
    doc.setLineWidth(0.3);

    doc.setFont(PDF_FONTS.heading, "bold");
    doc.setFontSize(13);
    setTextHex(doc, PDF_COLORS.textPrimary);
    const titleLine = params.stageName ?? this.documentTitle;
    doc.text(titleLine.slice(0, 90), marginLeft + 4, 33);
    if (params.subtitle) {
      doc.setFont(PDF_FONTS.body, "normal");
      doc.setFontSize(8);
      setTextHex(doc, PDF_COLORS.textMuted);
      doc.text(params.subtitle.slice(0, 110), marginLeft + 4, 38);
    }

    this.currentY = 45;
  }

  drawFooter(pageNum: number, totalPages: number) {
    const { pageW, pageH, marginLeft, marginRight } = PDF_SIZES;
    const doc = this.doc;
    const y = pageH - 12;

    setDrawHex(doc, PDF_COLORS.tableBorder);
    doc.setLineWidth(0.3);
    doc.line(marginLeft, y - 2, pageW - marginRight, y - 2);

    doc.setFont(PDF_FONTS.body, "normal");
    doc.setFontSize(7);
    setTextHex(doc, PDF_COLORS.textMuted);
    doc.text("FRMT — Centre National d'Excellence", marginLeft, y + 2);

    const confText = "Document confidentiel — Usage interne";
    const confW = doc.getTextWidth(confText);
    setTextHex(doc, PDF_COLORS.textLight);
    doc.text(confText, (pageW - confW) / 2, y + 2);

    const pageText = `Page ${pageNum} / ${totalPages}`;
    const pageW2 = doc.getTextWidth(pageText);
    setTextHex(doc, PDF_COLORS.textMuted);
    doc.text(pageText, pageW - marginRight - pageW2, y + 2);

    setFillHex(doc, PDF_COLORS.primary);
    doc.rect(0, pageH - 2, pageW, 2, "F");
  }

  sectionTitle(title: string, icon?: string) {
    this.checkPageBreak(14);
    const { marginLeft, contentW } = PDF_SIZES;
    const doc = this.doc;

    setFillHex(doc, PDF_COLORS.tableHeader);
    doc.rect(marginLeft, this.currentY, contentW, 8, "F");
    setFillHex(doc, PDF_COLORS.primary);
    doc.rect(marginLeft, this.currentY, 2.5, 8, "F");

    doc.setFont(PDF_FONTS.heading, "bold");
    doc.setFontSize(9);
    setTextHex(doc, PDF_COLORS.tableHeaderTx);
    doc.text((icon ? `${icon}  ` : "") + title.toUpperCase(), marginLeft + 5, this.currentY + 5.5);

    this.currentY += 11;
  }

  infoGrid(items: Array<{ label: string; value: string }>, columns = 2) {
    const { marginLeft, contentW, fontSmall, fontBody } = PDF_SIZES;
    const doc = this.doc;
    const colW = contentW / columns;
    const rowH = 7;
    let col = 0;

    for (const item of items) {
      this.checkPageBreak(rowH);
      const x = marginLeft + col * colW;

      doc.setFont(PDF_FONTS.body, "bold");
      doc.setFontSize(fontSmall);
      setTextHex(doc, PDF_COLORS.textMuted);
      const labelTxt = `${item.label.toUpperCase()} :`;
      doc.text(labelTxt, x + 2, this.currentY + 4);

      doc.setFont(PDF_FONTS.body, "normal");
      doc.setFontSize(fontBody);
      setTextHex(doc, PDF_COLORS.textPrimary);
      const labelW = doc.getTextWidth(labelTxt + " ");
      const val = (item.value ?? "—").slice(0, 48);
      doc.text(val, x + 2 + labelW + 1, this.currentY + 4);

      setDrawHex(doc, PDF_COLORS.tableBorder);
      doc.setLineWidth(0.2);
      doc.line(x + 1, this.currentY + rowH - 1, x + colW - 2, this.currentY + rowH - 1);

      col++;
      if (col >= columns) {
        col = 0;
        this.currentY += rowH;
      }
    }
    if (col > 0) this.currentY += rowH;
    this.currentY += 4;
  }

  table(params: {
    headers: string[];
    rows: (string | number)[][];
    colWidths?: number[];
    headerBg?: string;
    statusColIndex?: number;
  }) {
    const { marginLeft, contentW, tableHeaderH, tableRowH, fontSmall, fontBody, tablePadX } =
      PDF_SIZES;
    const doc = this.doc;
    const headers = params.headers;
    const totalCols = headers.length;
    const defaultColW = contentW / totalCols;
    const colWidths = params.colWidths ?? headers.map(() => defaultColW);

    this.checkPageBreak(tableHeaderH + 2);
    setFillHex(doc, params.headerBg ?? PDF_COLORS.tableHeader);
    doc.rect(marginLeft, this.currentY, contentW, tableHeaderH, "F");
    setFillHex(doc, PDF_COLORS.primary);
    doc.rect(marginLeft, this.currentY, 1.5, tableHeaderH, "F");

    let x = marginLeft;
    for (let i = 0; i < headers.length; i++) {
      doc.setFont(PDF_FONTS.heading, "bold");
      doc.setFontSize(fontSmall);
      setTextHex(doc, PDF_COLORS.tableHeaderTx);
      doc.text(String(headers[i]).toUpperCase(), x + tablePadX + 1, this.currentY + tableHeaderH / 2 + 2);
      x += colWidths[i]!;
    }
    this.currentY += tableHeaderH;

    const tableTop = this.currentY - tableHeaderH;

    for (let rowIdx = 0; rowIdx < params.rows.length; rowIdx++) {
      const row = params.rows[rowIdx]!;
      this.checkPageBreak(tableRowH + 1);

      if (rowIdx % 2 === 1) {
        setFillHex(doc, PDF_COLORS.tableRowAlt);
        doc.rect(marginLeft, this.currentY, contentW, tableRowH, "F");
      }

      x = marginLeft;
      for (let colIdx = 0; colIdx < row.length; colIdx++) {
        const cell = String(row[colIdx] ?? "—");
        if (colIdx === params.statusColIndex) {
          doc.setFont(PDF_FONTS.body, "bold");
          doc.setFontSize(fontSmall);
          setTextHex(doc, this.getStatusColor(cell));
        } else {
          doc.setFont(PDF_FONTS.body, "normal");
          doc.setFontSize(fontBody);
          setTextHex(doc, PDF_COLORS.textPrimary);
        }
        const maxW = colWidths[colIdx]! - tablePadX * 2;
        let truncated = cell;
        while (doc.getTextWidth(truncated) > maxW && truncated.length > 1) {
          truncated = truncated.slice(0, -2);
        }
        if (truncated !== cell) truncated += "…";
        doc.text(truncated, x + tablePadX, this.currentY + tableRowH / 2 + 2);
        x += colWidths[colIdx]!;
      }

      setDrawHex(doc, PDF_COLORS.tableBorder);
      doc.setLineWidth(0.15);
      doc.line(marginLeft, this.currentY + tableRowH, marginLeft + contentW, this.currentY + tableRowH);
      this.currentY += tableRowH;
    }

    setDrawHex(doc, PDF_COLORS.tableBorder);
    doc.setLineWidth(0.4);
    doc.rect(
      marginLeft,
      tableTop,
      contentW,
      tableHeaderH + tableRowH * params.rows.length,
      "S"
    );

    this.currentY += 6;
  }

  kpiRow(items: Array<{ label: string; value: string; color?: string }>) {
    this.checkPageBreak(18);
    const { marginLeft, contentW } = PDF_SIZES;
    const doc = this.doc;
    const itemW = contentW / items.length;

    for (let i = 0; i < items.length; i++) {
      const x = marginLeft + i * itemW;
      const color = items[i]!.color ?? PDF_COLORS.primary;

      setFillHex(doc, PDF_COLORS.bgMid);
      doc.roundedRect(x + 1, this.currentY, itemW - 2, 16, 2, 2, "F");
      setFillHex(doc, color);
      doc.rect(x + 1, this.currentY, itemW - 2, 1.5, "F");

      doc.setFont(PDF_FONTS.heading, "bold");
      doc.setFontSize(14);
      setTextHex(doc, color);
      const valW = doc.getTextWidth(items[i]!.value);
      doc.text(items[i]!.value, x + (itemW - valW) / 2, this.currentY + 9);

      doc.setFont(PDF_FONTS.body, "normal");
      doc.setFontSize(7);
      setTextHex(doc, PDF_COLORS.textMuted);
      const lblW = doc.getTextWidth(items[i]!.label);
      doc.text(items[i]!.label, x + (itemW - lblW) / 2, this.currentY + 14);
    }
    this.currentY += 20;
  }

  paragraph(text: string) {
    this.checkPageBreak(12);
    const { marginLeft, contentW, fontBody } = PDF_SIZES;
    const doc = this.doc;
    doc.setFont(PDF_FONTS.body, "normal");
    doc.setFontSize(fontBody);
    setTextHex(doc, PDF_COLORS.textSecondary);
    const lines = doc.splitTextToSize(text, contentW);
    doc.text(lines, marginLeft, this.currentY);
    this.currentY += lines.length * 4 + 4;
  }

  checkPageBreak(neededHeight: number) {
    const { pageH, marginBottom, marginTop } = PDF_SIZES;
    if (this.currentY + neededHeight > pageH - marginBottom) {
      const total = this.doc.getNumberOfPages();
      this.drawFooter(this.pageNumber, total);
      this.doc.addPage();
      this.pageNumber++;
      this.currentY = marginTop + 5;
      this.drawCompactHeader();
    }
  }

  drawCompactHeader() {
    const { pageW, marginLeft } = PDF_SIZES;
    setFillHex(this.doc, PDF_COLORS.primary);
    this.doc.rect(0, 0, pageW, 2, "F");
    this.doc.setFont(PDF_FONTS.body, "italic");
    this.doc.setFontSize(7);
    setTextHex(this.doc, PDF_COLORS.textMuted);
    this.doc.text(this.documentTitle.slice(0, 80), marginLeft, 8);
    this.currentY = 12;
  }

  getStatusColor(value: string): string {
    const v = value.toLowerCase();
    if (["confirmé", "confirmée", "actif", "présent", "ok", "terminé", "oui"].some((s) => v.includes(s)))
      return PDF_COLORS.green;
    if (["prévu", "planifié", "en attente", "partiel"].some((s) => v.includes(s)))
      return PDF_COLORS.amber;
    if (["annulé", "absent", "non", "manquant", "conflit"].some((s) => v.includes(s)))
      return PDF_COLORS.red;
    return PDF_COLORS.textPrimary;
  }

  addSpacer(mm = 4) {
    this.currentY += mm;
  }

  save(filename: string) {
    const total = this.doc.getNumberOfPages();
    for (let p = 1; p <= total; p++) {
      this.doc.setPage(p);
      this.drawFooter(p, total);
    }
    this.doc.save(filename);
  }
}
