import { PRINT_LOGO_CSS } from "@/lib/brand/print-logo";

/** Charte impression A4 — palette pro (gris ardoise) + legacy vert budget */
export const PRINT_COLORS = {
  green: "#1a5c2a",
  greenDark: "#0d3d1a",
  red: "#c8102e",
  gold: "#8B6914",
  cream: "#f5faf5",
  metaBg: "#fffdf5",
  border: "#c8d8c8",
  text: "#111111",
  muted: "#666666",
  /** Style tableaux professionnel */
  slate800: "#1E293B",
  slate600: "#475569",
  slate200: "#E2E8F0",
  slate100: "#F1F5F9",
  slate50: "#F8FAFC",
} as const;

export function getPrintReportCss(options?: { legacy?: boolean }): string {
  const legacy = options?.legacy ?? false;
  const c = PRINT_COLORS;

  const proTableCss = `
  .rt thead tr { background: ${c.slate100} !important; }
  .rt thead th {
    color: ${c.slate800} !important;
    font-weight: bold !important;
    font-size: 8pt !important;
    padding: 7px 9px !important;
    text-align: center !important;
    border: 0.5pt solid ${c.slate200} !important;
    border-bottom: 1.5pt solid #CBD5E1 !important;
    text-transform: uppercase !important;
    vertical-align: middle !important;
    white-space: nowrap !important;
  }
  .rt tbody tr:nth-child(odd)  { background: #fff !important; }
  .rt tbody tr:nth-child(even) { background: ${c.slate50} !important; }
  .rt tbody td {
    padding: 6px 9px !important;
    border: 0.5pt solid ${c.slate200} !important;
    color: #334155 !important;
    font-size: 8.5pt !important;
    vertical-align: middle !important;
  }
  .rt tfoot tr { background: ${c.slate100} !important; }
  .rt tfoot td {
    padding: 7px 9px !important;
    font-weight: bold !important;
    font-size: 9pt !important;
    color: ${c.slate800} !important;
    border: 0.5pt solid ${c.slate200} !important;
    border-top: 1.5pt solid #CBD5E1 !important;
  }
  .section-title {
    font-size: 10pt !important;
    font-weight: bold !important;
    color: ${c.slate800} !important;
    text-transform: uppercase !important;
    border-bottom: 1pt solid ${c.slate200} !important;
    padding-bottom: 4px !important;
    margin: 16px 0 8px 0 !important;
  }
  .report-title-block {
    background: ${c.slate50} !important;
    border-left: 4pt solid ${c.slate600} !important;
    padding: 10px 16px !important;
    margin-bottom: 10px !important;
  }
  .report-title-block h1 {
    font-size: 14pt !important;
    font-weight: bold !important;
    color: ${c.slate800} !important;
    margin: 0 !important;
    text-transform: uppercase !important;
  }
  .title-divider {
    height: 1px !important;
    background: ${c.slate200} !important;
    margin: 6px 0 14px 0 !important;
  }
  .kpi-box {
    border: 0.5pt solid ${c.slate200} !important;
    border-top: 3pt solid ${c.slate600} !important;
    padding: 8px !important;
    text-align: center !important;
    background: #fff !important;
  }
  .kpi-value { color: ${c.slate800} !important; }
  .print-footer { border-top: 1pt solid ${c.slate200} !important; }
  .print-footer .fl { color: ${c.slate600} !important; }
  .ph { border-bottom: 3px solid ${c.slate200} !important; }
  .ph-org-name { color: ${c.slate800} !important; }
  .meta-box { border-left: 4pt solid ${c.slate600} !important; background: ${c.slate50} !important; }
`;

  const legacyTableCss = `
  .rt.rt-legacy thead tr { background: ${c.green} !important; }
  .rt.rt-legacy thead th {
    color: #fff !important;
    border: 0.5pt solid ${c.greenDark} !important;
    border-bottom: none !important;
  }
  .rt.rt-legacy tbody tr:nth-child(even) { background: #f5faf5 !important; }
  .rt.rt-legacy tbody td { border: 0.5pt solid ${c.border} !important; color: #111 !important; }
  .rt.rt-legacy tfoot tr { background: #e8f5e9 !important; }
  .rt.rt-legacy tfoot td {
    color: ${c.green} !important;
    border: 0.5pt solid #a8c8a8 !important;
    border-top: 2pt solid ${c.green} !important;
  }
  .report-title-block--legacy {
    background: #f0f7f0 !important;
    border-left: 5px solid ${c.red} !important;
  }
  .report-title-block--legacy h1 { color: ${c.green} !important; }
  .title-divider { height: 2px !important; background: ${c.gold} !important; }
  .kpi-box--legacy {
    border: 0.5pt solid ${c.green} !important;
    border-top: 3pt solid ${c.green} !important;
    background: #f8fdf8 !important;
  }
  .kpi-box--legacy .kpi-value { color: ${c.green} !important; }
  .print-footer--legacy { border-top: 1pt solid ${c.green} !important; }
  .print-footer--legacy .fl { color: ${c.green} !important; }
`;

  const tableBlock = legacy ? legacyTableCss : proTableCss;

  return `
/* ÉCRAN — cacher la version impression */
.print-only { display: none; }

@media print {
  @page {
    size: A4 portrait;
    margin: 15mm 14mm 20mm 14mm;
  }
  * {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    box-sizing: border-box !important;
    letter-spacing: 0 !important;
    word-spacing: 0 !important;
  }
  body {
    background: #fff !important;
    color: #111 !important;
    font-family: Arial, Helvetica, sans-serif !important;
    font-size: 10pt !important;
    margin: 0 !important;
    padding: 0 !important;
  }
  nav, .sidebar, .navbar, .no-print,
  button, .btn, [data-noprint],
  header:not(.print-header),
  footer:not(.print-footer) {
    display: none !important;
  }
  .print-only { display: block !important; }
  .no-print   { display: none !important; }
  img {
    display: block !important;
    visibility: visible !important;
    -webkit-print-color-adjust: exact !important;
  }
  .ph {
    display: flex !important;
    align-items: center !important;
    gap: 16px !important;
    padding-bottom: 10px !important;
    margin-bottom: 4px !important;
  }
  .ph img { width: 80px !important; height: auto !important; }
  .ph-org { flex: 1 !important; }
  .ph-org-name {
    font-size: 13pt !important; font-weight: bold !important;
    text-transform: uppercase !important;
  }
  .ph-org-sub {
    font-size: 10pt !important; font-weight: bold !important;
    color: #8B6914 !important; margin-top: 2px !important;
    text-transform: uppercase !important;
  }
  .ph-meta {
    text-align: right !important; font-size: 8pt !important;
    color: #666 !important; line-height: 1.6 !important;
  }
  .ph-meta-gen { text-transform: uppercase !important; letter-spacing: 0.02em !important; }
  .report-title-block p {
    font-size: 9pt !important; color: #555 !important;
    margin: 4px 0 0 0 !important;
  }
  .kpi-row {
    display: grid !important;
    grid-template-columns: repeat(4, 1fr) !important;
    gap: 8px !important;
    margin-bottom: 16px !important;
  }
  .kpi-label {
    display: block !important; font-size: 7pt !important;
    text-transform: uppercase !important; color: #666 !important;
    margin-bottom: 4px !important;
  }
  .kpi-value {
    display: block !important; font-size: 20pt !important;
    font-weight: bold !important; line-height: 1 !important;
  }
  .kpi-sub {
    display: block !important; font-size: 7pt !important;
    color: #999 !important; margin-top: 3px !important;
  }
  .meta-box {
    border: 0.5pt solid #d0d8d0 !important;
    padding: 7px 12px !important;
    margin-bottom: 14px !important;
    font-size: 8.5pt !important;
  }
  .meta-box table { width: 100% !important; border: none !important; margin: 0 !important; }
  .meta-box td {
    border: none !important; padding: 2px 8px 2px 0 !important;
    color: #333 !important; font-size: 8.5pt !important;
  }
  .meta-box td:first-child {
    font-weight: bold !important; color: #555 !important;
    width: 30% !important; white-space: nowrap !important;
  }
  .rt {
    width: 100% !important;
    border-collapse: collapse !important;
    font-size: 8.5pt !important;
    font-family: Arial, Helvetica, sans-serif !important;
    margin-bottom: 14px !important;
  }
  .rt thead { display: table-header-group !important; }
  .rt tfoot { display: table-footer-group !important; }
  .rt thead th.tl { text-align: left !important; }
  .rt tbody tr { page-break-inside: avoid !important; }
  .rt tbody td.tc { text-align: center !important; }
  .rt tbody td.tr { text-align: right !important; }
  .rt tbody td.bold { font-weight: bold !important; }
  ${tableBlock}
  .s-prevu   { color: #1565C0 !important; font-weight: bold !important; }
  .s-encours { color: #E65100 !important; font-weight: bold !important; }
  .s-termine { color: #1a5c2a !important; font-weight: bold !important; }
  .s-annule  { color: #B71C1C !important; font-weight: bold !important; }
  .s-oui     { color: #1a5c2a !important; font-weight: bold !important; }
  .s-non     { color: #B71C1C !important; }
  .print-footer {
    position: fixed !important; bottom: 5mm !important;
    left: 14mm !important; right: 14mm !important;
    padding-top: 4px !important;
    display: flex !important;
    justify-content: space-between !important;
    align-items: center !important;
    font-size: 7.5pt !important; color: #666 !important;
  }
  .print-footer .fc { font-style: italic !important; color: #888 !important; }
  .pnum::before { content: counter(page); }
  .page-break { page-break-before: always !important; }
  .no-break   { page-break-inside: avoid !important; }
  .report-note {
    font-size: 8pt !important; color: #777 !important;
    font-style: italic !important; margin-top: 4px !important;
    border-left: 3pt solid #94A3B8 !important;
    padding-left: 6px !important;
  }
}

html, body { margin: 0; padding: 0; background: #fff; color: #111; font-family: Arial, Helvetica, sans-serif; font-size: 10pt; }
.print-doc { max-width: 186mm; margin: 0 auto; padding: 12px 0 24mm; }
.ph { display: flex; align-items: center; gap: 16px; padding-bottom: 10px; margin-bottom: 4px; }
.ph img { width: 80px; height: auto; }
.ph-org { flex: 1; }
.ph-org-name { font-size: 13pt; font-weight: bold; text-transform: uppercase; margin: 0; }
.ph-meta { text-align: right; font-size: 8pt; color: #666; line-height: 1.6; }
.report-title-block { padding: 10px 16px; margin-bottom: 10px; }
.report-title-block h1 { font-size: 14pt; font-weight: bold; margin: 0; text-transform: uppercase; }
.report-title-block p { font-size: 9pt; color: #555; margin: 4px 0 0; }
.kpi-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 16px; }
.kpi-box { padding: 8px; text-align: center; }
.kpi-label { display: block; font-size: 7pt; text-transform: uppercase; color: #666; margin-bottom: 4px; }
.kpi-value { display: block; font-size: 20pt; font-weight: bold; line-height: 1; }
.meta-box { border: 0.5pt solid #d0d8d0; padding: 7px 12px; margin-bottom: 14px; font-size: 8.5pt; }
.meta-box table { width: 100%; border: none; margin: 0; }
.meta-box td { border: none; padding: 2px 8px 2px 0; color: #333; font-size: 8.5pt; }
.meta-box td:first-child { font-weight: bold; color: #555; width: 30%; white-space: nowrap; }
.section-title { font-size: 10pt; font-weight: bold; text-transform: uppercase; padding-bottom: 4px; margin: 16px 0 8px; }
.rt { width: 100%; border-collapse: collapse; font-size: 8.5pt; margin-bottom: 14px; }
.rt thead th.tl { text-align: left; }
.rt tbody td.tc { text-align: center; }
.rt tbody td.tr { text-align: right; }
.rt tbody td.bold { font-weight: bold; }
${tableBlock}
.s-prevu { color: #1565C0; font-weight: bold; }
.s-encours { color: #E65100; font-weight: bold; }
.s-termine { color: #1a5c2a; font-weight: bold; }
.s-annule { color: #B71C1C; font-weight: bold; }
.s-oui { color: #1a5c2a; font-weight: bold; }
.s-non { color: #B71C1C; }
.report-note { font-size: 8pt; color: #777; font-style: italic; margin-top: 4px; border-left: 3pt solid #94A3B8; padding-left: 6px; }
.print-footer { padding-top: 8px; margin-top: 24px; display: flex; justify-content: space-between; font-size: 7.5pt; color: #666; }
.print-footer .fc { font-style: italic; color: #888; }
${PRINT_LOGO_CSS}
`;
}
