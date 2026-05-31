import { jsPDF } from "jspdf";

import type { LettreBuiltContent, LettreChambreGroupe, LettreParticipantLine } from "@/lib/letters/letter-types";
import { LETTER_FOOTER_LINES } from "@/lib/letters/letter-content";
import {
  drawLettreCachet,
  drawLettreLogoHeader,
  drawLettrePageFrame,
  LETTER_FOOTER_ZONE_MM,
  LETTER_SIGNATURE_BLOCK_MM,
} from "@/lib/letters/letter-layout";

const MARGIN = 20;
const LINE = 5.5;
const BODY_TOP = 40;

function wrapText(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxW: number,
  lineHeight: number
): number {
  const lines = doc.splitTextToSize(text, maxW);
  doc.text(lines, x, y);
  return y + lines.length * lineHeight;
}

function bodyBottomLimit(pageH: number): number {
  return pageH - LETTER_FOOTER_ZONE_MM - LETTER_SIGNATURE_BLOCK_MM;
}

function ensureSpace(doc: jsPDF, y: number, need: number, pageH: number): number {
  if (y + need > bodyBottomLimit(pageH)) {
    doc.addPage();
    const pageW = doc.internal.pageSize.getWidth();
    drawLettrePageFrame(doc, pageW, pageH);
    return BODY_TOP;
  }
  return y;
}

function drawFooter(doc: jsPDF, pageW: number, pageH: number) {
  const y0 = pageH - LETTER_FOOTER_ZONE_MM + 2;
  const colW = (pageW - MARGIN * 2) / 2 - 4;
  doc.setFontSize(6.5);
  doc.setFont("times", "bold");
  doc.setTextColor(0, 98, 51);
  doc.text(LETTER_FOOTER_LINES.casablanca.label, MARGIN, y0);
  doc.setFont("times", "normal");
  doc.setTextColor(40, 40, 40);
  let y = y0 + 3.2;
  for (const line of LETTER_FOOTER_LINES.casablanca.lines) {
    doc.text(line, MARGIN, y, { maxWidth: colW });
    y += 3.1;
  }
  const rx = pageW / 2 + 2;
  doc.setFont("times", "bold");
  doc.setTextColor(0, 98, 51);
  doc.text(LETTER_FOOTER_LINES.rabat.label, rx, y0);
  doc.setFont("times", "normal");
  doc.setTextColor(40, 40, 40);
  y = y0 + 3.2;
  for (const line of LETTER_FOOTER_LINES.rabat.lines) {
    doc.text(line, rx, y, { maxWidth: colW });
    y += 3.1;
  }
  doc.setDrawColor(0, 98, 51);
  doc.setLineWidth(0.3);
  doc.line(pageW / 2, y0 - 2, pageW / 2, pageH - 10);
}

/** Signature + cachet : position dynamique selon longueur du texte, au-dessus du pied de page. */
function drawSignatureBlock(
  doc: jsPDF,
  pageW: number,
  pageH: number,
  content: LettreBuiltContent,
  yAfterBody: number,
  logoBase64?: string | null,
  logoFormat: "PNG" | "SVG" = "PNG",
  cachetBase64?: string | null,
  cachetFormat: "PNG" | "JPEG" = "JPEG"
) {
  const footerTop = pageH - LETTER_FOOTER_ZONE_MM;
  const blockH = LETTER_SIGNATURE_BLOCK_MM;
  let blockTop = yAfterBody + 10;

  if (blockTop + blockH > footerTop - 2) {
    doc.addPage();
    drawLettrePageFrame(doc, pageW, pageH);
    blockTop = footerTop - blockH - 6;
  } else if (blockTop < footerTop - blockH - 6) {
    blockTop = footerTop - blockH - 6;
  }

  const sigX = pageW - MARGIN;
  const cachetW = 56;
  const cachetH = 44;
  const cachetCenterX = sigX - 64;
  const cachetCenterY = blockTop + blockH * 0.48;

  drawLettreCachet(doc, cachetCenterX, cachetCenterY, 22, cachetBase64, cachetFormat, {
    w: cachetW,
    h: cachetH,
  });

  const nameY = blockTop + blockH - 8;
  const titleY = nameY - LINE - 1;

  doc.setFont("times", "normal");
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  const titleLines = doc.splitTextToSize(content.signatureTitle, 75);
  const ty = titleY - (titleLines.length - 1) * LINE;
  doc.text(titleLines, sigX, ty, { align: "right" });

  doc.setFont("times", "bold");
  doc.text(content.signatureName, sigX, nameY, { align: "right" });
}

function drawFootersOnAllPages(
  doc: jsPDF,
  pageW: number,
  pageH: number
) {
  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    drawFooter(doc, pageW, pageH);
  }
}

function drawParticipantLine(doc: jsPDF, p: LettreParticipantLine, y: number): number {
  doc.setFont("times", "bold");
  const prefix = `- ${p.nom.toUpperCase()}`;
  doc.text(prefix, MARGIN + 4, y);
  doc.setFont("times", "normal");
  doc.text(` ${p.prenom}`, MARGIN + 4 + doc.getTextWidth(`${prefix} `), y);
  return y + LINE;
}

function drawSectionTitle(doc: jsPDF, title: string, y: number, underline: boolean): number {
  doc.setFont("times", "bold");
  doc.setFontSize(11);
  if (underline) {
    const w = doc.getTextWidth(title);
    doc.text(title, MARGIN, y);
    doc.setLineWidth(0.25);
    doc.line(MARGIN, y + 0.8, MARGIN + w, y + 0.8);
  } else {
    doc.text(title, MARGIN, y);
  }
  return y + LINE + 1;
}

function drawChambreGroupe(
  doc: jsPDF,
  groupe: LettreChambreGroupe,
  y: number,
  pageH: number,
  maxW: number
): number {
  let curY = ensureSpace(doc, y, 16, pageH);
  curY = drawSectionTitle(doc, groupe.title, curY, true);
  doc.setFont("times", "normal");
  for (const p of groupe.participants) {
    curY = ensureSpace(doc, curY, LINE, pageH);
    curY = drawParticipantLine(doc, p, curY);
  }
  return curY + 2;
}

function drawListeParticipants(
  doc: jsPDF,
  content: LettreBuiltContent,
  y: number,
  pageH: number
): number {
  let curY = y;
  if (content.joueurs.length > 0) {
    curY = ensureSpace(doc, curY, 14, pageH);
    curY = drawSectionTitle(doc, "Joueurs et joueuses :", curY, true);
    doc.setFont("times", "normal");
    for (const p of content.joueurs) {
      curY = ensureSpace(doc, curY, LINE, pageH);
      curY = drawParticipantLine(doc, p, curY);
    }
    curY += 2;
  }
  if (content.coachs.length > 0) {
    curY = ensureSpace(doc, curY, 14, pageH);
    curY = drawSectionTitle(doc, "Staff technique :", curY, true);
    doc.setFont("times", "normal");
    for (const p of content.coachs) {
      curY = ensureSpace(doc, curY, LINE, pageH);
      curY = drawParticipantLine(doc, p, curY);
    }
    curY += 2;
  }
  return curY;
}

export function generateLettrePdf(
  content: LettreBuiltContent,
  logoBase64?: string | null,
  logoFormat: "PNG" | "SVG" = "PNG",
  cachetBase64?: string | null,
  cachetFormat: "PNG" | "JPEG" = "JPEG"
): Uint8Array {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const maxW = pageW - MARGIN * 2;

  drawLettrePageFrame(doc, pageW, pageH);
  let y = drawLettreLogoHeader(doc, pageW, logoBase64, logoFormat);

  doc.setFont("times", "normal");
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text(content.dateLettre, pageW - MARGIN, 16, { align: "right" });
  y = Math.max(y, 22) + 6;

  y = ensureSpace(doc, y, 18, pageH);
  doc.setFont("times", "bold");
  const destLines = doc.splitTextToSize(content.destinataireLigne, maxW - 8);
  doc.text(destLines, pageW / 2, y, { align: "center" });
  y += destLines.length * LINE + 8;

  doc.setFont("times", "bold");
  const objetText = `Objet : ${content.objet}`;
  const objetLines = doc.splitTextToSize(objetText, maxW);
  for (let i = 0; i < objetLines.length; i++) {
    const line = objetLines[i] as string;
    doc.text(line, MARGIN, y);
    const lw = doc.getTextWidth(line);
    doc.setLineWidth(0.25);
    doc.line(MARGIN, y + 0.8, MARGIN + lw, y + 0.8);
    y += LINE;
  }
  y += 4;

  doc.setFont("times", "normal");
  doc.text("Monsieur,", MARGIN, y);
  y += LINE + 2;

  for (const para of content.introParagraphs) {
    y = ensureSpace(doc, y, 12, pageH);
    y = wrapText(doc, para, MARGIN, y, maxW, LINE);
    y += 3;
  }

  if (content.mode === "hebergement_complet") {
    if (content.hebergementRepartitionIntro) {
      y = ensureSpace(doc, y, 12, pageH);
      y = wrapText(doc, content.hebergementRepartitionIntro, MARGIN, y, maxW, LINE);
      y += 3;
    }
    if (content.chambreGroupes.length > 0) {
      for (const g of content.chambreGroupes) {
        y = drawChambreGroupe(doc, g, y, pageH, maxW);
      }
    } else {
      y = drawListeParticipants(doc, content, y, pageH);
    }
  } else {
    y = drawListeParticipants(doc, content, y, pageH);
    if (content.hebergementCoachParagraph) {
      y = ensureSpace(doc, y, 12, pageH);
      y = wrapText(doc, content.hebergementCoachParagraph, MARGIN, y, maxW, LINE);
      y += 3;
    }
  }

  if (content.exceptions.length > 0) {
    y = ensureSpace(doc, y, 12, pageH);
    y = wrapText(
      doc,
      "Merci également de prendre en compte les dates d'hébergement suivantes :",
      MARGIN,
      y,
      maxW,
      LINE
    );
    y += 2;
    for (const ex of content.exceptions) {
      y = ensureSpace(doc, y, LINE, pageH);
      y = wrapText(doc, `- ${ex.label} : ${ex.detail}`, MARGIN + 4, y, maxW - 4, LINE);
      y += 2;
    }
    y += 2;
  }

  for (const para of content.closingParagraphs) {
    y = ensureSpace(doc, y, 14, pageH);
    y = wrapText(doc, para, MARGIN, y, maxW, LINE);
    y += 3;
  }

  drawSignatureBlock(
    doc,
    pageW,
    pageH,
    content,
    y,
    logoBase64,
    logoFormat,
    cachetBase64,
    cachetFormat
  );
  drawFootersOnAllPages(doc, pageW, pageH);

  return new Uint8Array(doc.output("arraybuffer"));
}
