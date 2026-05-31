import type { jsPDF } from "jspdf";

/** Logo en-tête seul (modèle Word : logo en haut à gauche). */
export function drawLettreLogoHeader(
  doc: jsPDF,
  pageW: number,
  logoBase64?: string | null,
  logoFormat: "PNG" | "SVG" = "PNG"
): number {
  const logoX = 14;
  const logoY = 10;
  if (logoBase64) {
    try {
      const mime = logoFormat === "SVG" ? "image/svg+xml" : "image/png";
      doc.addImage(`data:${mime};base64,${logoBase64}`, logoFormat, logoX, logoY, 32, 22);
    } catch {
      /* logo optionnel */
    }
  }
  return 36;
}

/** Cadre page : filets vert / rouge (papier à en-tête). */
export function drawLettrePageFrame(doc: jsPDF, pageW: number, pageH: number) {
  const m = 8;
  doc.setDrawColor(0, 98, 51);
  doc.setLineWidth(0.55);
  doc.rect(m, m, pageW - m * 2, pageH - m * 2);
  doc.setDrawColor(204, 0, 0);
  doc.setLineWidth(0.35);
  doc.rect(m + 1.2, m + 1.2, pageW - m * 2 - 2.4, pageH - m * 2 - 2.4);
}

/** Cachet institutionnel (image du modèle Word si fournie). */
export function drawLettreCachet(
  doc: jsPDF,
  centerX: number,
  centerY: number,
  radius = 18,
  cachetBase64?: string | null,
  cachetFormat: "PNG" | "JPEG" = "JPEG",
  sizeMm?: { w: number; h: number }
) {
  if (!cachetBase64) return false;
  try {
    const mime = cachetFormat === "JPEG" ? "image/jpeg" : "image/png";
    const fmt = cachetFormat === "JPEG" ? "JPEG" : "PNG";
    const w = sizeMm?.w ?? radius * 2.4;
    const h = sizeMm?.h ?? radius * 2.2;
    doc.addImage(
      `data:${mime};base64,${cachetBase64}`,
      fmt,
      centerX - w / 2,
      centerY - h / 2,
      w,
      h
    );
    return true;
  } catch {
    return false;
  }
}

/** Zone réservée en bas de page A4 (mm). */
export const LETTER_FOOTER_ZONE_MM = 34;
export const LETTER_SIGNATURE_BLOCK_MM = 42;
