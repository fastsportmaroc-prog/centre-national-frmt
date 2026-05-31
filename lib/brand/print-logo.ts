import { LOGO_FRMT_PNG_DATA_URI } from "@/lib/brand/logo-frmt-base64";

/** Styles CSS communs pour affichage logo à l'impression (fond transparent préservé). */
export const PRINT_LOGO_CSS = `
  @media print {
    img, svg {
      display: block !important;
      visibility: visible !important;
      opacity: 1 !important;
    }
    .logo-frmt,
    .report-logo,
    .logo-slot img {
      display: block !important;
      width: 80px !important;
      height: auto !important;
      max-width: 80px !important;
      object-fit: contain !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
  }
`;

/** Data URI PNG officiel (base64 embarqué, fiable en print/PDF). */
export function getOfficialLogoDataUri(): string {
  return LOGO_FRMT_PNG_DATA_URI;
}

/** Balise img pour rapports HTML / fenêtre d'impression. */
export function getOfficialLogoImgHtml(sizePx = 80, className = "logo-frmt report-logo"): string {
  const uri = getOfficialLogoDataUri();
  return `<img src="${uri}" alt="Logo fédération" class="${className}" width="${sizePx}" height="${sizePx}" style="width:${sizePx}px;height:auto;max-width:${sizePx}px;object-fit:contain;display:block"/>`;
}
