import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { getOfficialLogoImgHtml, PRINT_LOGO_CSS } from "@/lib/brand/print-logo";
import { FEDERATION_NAME, FRMT_GREEN, FRMT_RED, REPORT_FOOTER } from "@/lib/constants/branding";

/** Charte documents officiels FRMT (alignée logo : vert, rouge, or). */
export const FRMT_DOC = {
  red: FRMT_RED,
  green: FRMT_GREEN,
  greenDark: "#004d28",
  gold: "#C9A227",
  cream: "#F7FAF8",
  mint: "#E8F5EC",
  text: "#1a2e24",
  textMuted: "#5c6b63",
  border: "#c5ddd0",
  white: "#ffffff",
} as const;

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Styles CSS partagés — impression navigateur & aperçu PDF. */
export function getFrmtPrintDocumentCss(): string {
  const c = FRMT_DOC;
  return `
  @page { size: A4; margin: 12mm 14mm; }
  * { box-sizing: border-box; }
  body {
    font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
    font-size: 11px;
    line-height: 1.45;
    color: ${c.text};
    background: ${c.white};
    margin: 0;
    padding: 0;
  }
  .frmt-tricolor {
    height: 4px;
    background: linear-gradient(90deg, ${c.red} 0%, ${c.red} 33.33%, ${c.green} 33.33%, ${c.green} 66.66%, ${c.gold} 66.66%, ${c.gold} 100%);
    margin: 0 0 0 0;
  }
  .frmt-doc-sheet { max-width: 186mm; margin: 0 auto; padding: 0 0 8mm; }
  .frmt-doc-header {
    display: flex;
    align-items: center;
    gap: 18px;
    padding: 14px 16px;
    margin-bottom: 16px;
    background: linear-gradient(135deg, ${c.cream} 0%, ${c.white} 55%);
    border: 1px solid ${c.border};
    border-radius: 8px;
    box-shadow: 0 2px 12px rgba(0, 98, 51, 0.06);
  }
  .frmt-doc-header .logo-wrap { flex: 0 0 88px; }
  .frmt-doc-header .logo-wrap img { width: 88px !important; height: auto !important; max-width: 88px !important; }
  .frmt-doc-header .brand-fed {
    font-size: 11px;
    font-weight: 700;
    color: ${c.green};
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin: 0;
    line-height: 1.35;
    max-width: 420px;
  }
  .frmt-doc-header .brand-centre {
    font-size: 13px;
    font-weight: 800;
    color: ${c.greenDark};
    margin: 6px 0 0;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }
  .frmt-doc-header .brand-meta {
    font-size: 9px;
    color: ${c.textMuted};
    margin-top: 8px;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }
  .frmt-doc-title-wrap {
    margin: 0 0 14px;
    padding: 12px 16px 12px 14px;
    background: ${c.mint};
    border-left: 4px solid ${c.red};
    border-radius: 0 6px 6px 0;
    border: 1px solid ${c.border};
    border-left-width: 4px;
    border-left-color: ${c.red};
  }
  .frmt-doc-title {
    margin: 0;
    font-size: 17px;
    font-weight: 800;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: ${c.greenDark};
  }
  .frmt-doc-subtitle { margin: 6px 0 0; font-size: 12px; color: ${c.text}; }
  .frmt-doc-meta {
    font-size: 10px;
    color: ${c.textMuted};
    margin: 0 0 16px;
    padding: 8px 12px;
    background: ${c.cream};
    border-radius: 4px;
  }
  .frmt-section-title {
    font-size: 11px;
    font-weight: 700;
    color: ${c.green};
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin: 18px 0 8px;
    padding-bottom: 4px;
    border-bottom: 2px solid ${c.gold};
  }
  table.frmt-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 10.5px;
    table-layout: fixed;
  }
  table.frmt-table thead th {
    background: ${c.green} !important;
    color: #fff !important;
    font-weight: 700;
    text-transform: uppercase;
    font-size: 9px;
    letter-spacing: 0.05em;
    padding: 9px 8px;
    border: 1px solid ${c.greenDark};
    text-align: left;
  }
  table.frmt-table tbody td {
    border: 1px solid ${c.border};
    padding: 7px 8px;
    vertical-align: top;
    word-break: break-word;
  }
  table.frmt-table tbody tr:nth-child(even) { background: ${c.cream}; }
  table.frmt-table tbody tr:hover { background: ${c.mint}; }
  .frmt-doc-footer {
    margin-top: 24px;
    padding: 10px 14px;
    font-size: 9px;
    color: rgba(255,255,255,0.92);
    background: ${c.green};
    border-radius: 4px;
    text-align: center;
  }
  .frmt-doc-footer::before {
    content: "";
    display: block;
    height: 2px;
    margin: -10px -14px 8px;
    background: linear-gradient(90deg, ${c.red}, ${c.gold});
    border-radius: 4px 4px 0 0;
  }
  .frmt-sig { margin-top: 28px; page-break-inside: avoid; }
  .frmt-sig-line { border-top: 1px solid ${c.green}; width: 220px; margin-top: 32px; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .frmt-doc-sheet { max-width: none; }
    .frmt-doc-header, .frmt-doc-title-wrap, .frmt-sig { break-inside: avoid; page-break-inside: avoid; }
  }
  ${PRINT_LOGO_CSS}
`;
}

/** En-tête institutionnel standard (logo + libellés fédération). */
export function buildFrmtPrintHeaderHtml(opts?: {
  generatedLabel?: string;
  showAppLine?: boolean;
}): string {
  const dateGen =
    opts?.generatedLabel ??
    format(new Date(), "dd MMMM yyyy", { locale: fr }).toLocaleUpperCase("fr-FR");
  return `
  <div class="frmt-tricolor"></div>
  <header class="frmt-doc-header">
    <div class="logo-wrap">${getOfficialLogoImgHtml(88, "logo-frmt report-logo")}</div>
    <div>
      <p class="brand-fed">${esc(FEDERATION_NAME)}</p>
      ${
        opts?.showAppLine !== false
          ? `<p class="brand-meta">Document officiel</p>`
          : ""
      }
      <p class="brand-meta">Généré le ${esc(dateGen)}</p>
    </div>
  </header>`;
}

export function buildFrmtPrintTitleBlock(titre: string, sousTitre?: string): string {
  return `
  <div class="frmt-doc-title-wrap">
    <h1 class="frmt-doc-title">${esc(titre)}</h1>
    ${sousTitre ? `<p class="frmt-doc-subtitle">${esc(sousTitre)}</p>` : ""}
  </div>`;
}

export function buildFrmtPrintFooterHtml(): string {
  return `<footer class="frmt-doc-footer">${esc(REPORT_FOOTER)}</footer>`;
}
