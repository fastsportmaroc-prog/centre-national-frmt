import { PRINT_LOGO_CSS } from "@/lib/brand/print-logo";

/** Charte impression A4 — vert #1a5c2a, rouge #c8102e, or #8B6914 */
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
} as const;

export function getPrintReportCss(): string {
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
  /* ── PAGE HEADER ── */
  .ph {
    display: flex !important;
    align-items: center !important;
    gap: 16px !important;
    padding-bottom: 10px !important;
    border-bottom: 4px solid #1a5c2a !important;
    margin-bottom: 4px !important;
  }
  .ph img { width: 80px !important; height: auto !important; }
  .ph-org { flex: 1 !important; }
  .ph-org-name {
    font-size: 13pt !important; font-weight: bold !important;
    color: #1a5c2a !important; text-transform: uppercase !important;
  }
  .ph-org-sub {
    font-size: 10pt !important; font-weight: bold !important;
    color: #8B6914 !important; margin-top: 2px !important;
    text-transform: uppercase !important;
  }
  .ph-org-ar {
    font-size: 9pt !important; color: #777 !important;
    margin-top: 3px !important; direction: rtl !important;
  }
  .ph-meta {
    text-align: right !important; font-size: 8pt !important;
    color: #666 !important; line-height: 1.6 !important;
  }
  .ph-meta-gen {
    text-transform: uppercase !important;
    letter-spacing: 0.02em !important;
  }
  .ph-meta strong { color: #1a5c2a !important; }
  /* Ligne or */
  .gold-line {
    height: 2px !important;
    background: #8B6914 !important;
    margin: 6px 0 14px 0 !important;
  }
  /* ── TITRE RAPPORT ── */
  .report-title-block {
    background: #f0f7f0 !important;
    border-left: 5px solid #c8102e !important;
    padding: 10px 16px !important;
    margin-bottom: 14px !important;
  }
  .report-title-block h1 {
    font-size: 15pt !important; font-weight: bold !important;
    color: #1a5c2a !important; margin: 0 !important;
    text-transform: uppercase !important; letter-spacing: 0.5pt !important;
  }
  .report-title-block p {
    font-size: 9pt !important; color: #555 !important;
    margin: 4px 0 0 0 !important;
  }
  /* ── KPI ── */
  .kpi-row {
    display: grid !important;
    grid-template-columns: repeat(4, 1fr) !important;
    gap: 8px !important;
    margin-bottom: 16px !important;
  }
  .kpi-box {
    border: 0.5pt solid #1a5c2a !important;
    border-top: 3pt solid #1a5c2a !important;
    padding: 8px !important;
    text-align: center !important;
    background: #f8fdf8 !important;
  }
  .kpi-label {
    display: block !important; font-size: 7pt !important;
    text-transform: uppercase !important; color: #666 !important;
    margin-bottom: 4px !important;
  }
  .kpi-value {
    display: block !important; font-size: 20pt !important;
    font-weight: bold !important; color: #1a5c2a !important;
    line-height: 1 !important;
  }
  .kpi-sub {
    display: block !important; font-size: 7pt !important;
    color: #999 !important; margin-top: 3px !important;
  }
  /* ── META BOX ── */
  .meta-box {
    border: 0.5pt solid #d0d8d0 !important;
    border-left: 4pt solid #8B6914 !important;
    background: #fffdf5 !important;
    padding: 7px 12px !important;
    margin-bottom: 14px !important;
    font-size: 8.5pt !important;
  }
  .meta-box table {
    width: 100% !important; border: none !important; margin: 0 !important;
  }
  .meta-box td {
    border: none !important; padding: 2px 8px 2px 0 !important;
    color: #333 !important; font-size: 8.5pt !important;
  }
  .meta-box td:first-child {
    font-weight: bold !important; color: #555 !important;
    width: 30% !important; white-space: nowrap !important;
  }
  /* ── SECTION TITLE ── */
  .section-title {
    font-size: 10.5pt !important; font-weight: bold !important;
    color: #1a5c2a !important; text-transform: uppercase !important;
    border-bottom: 2pt solid #c8102e !important;
    padding-bottom: 4px !important;
    margin: 16px 0 8px 0 !important;
    page-break-after: avoid !important;
  }
  /* ── TABLEAU ── */
  .rt {
    width: 100% !important;
    border-collapse: collapse !important;
    font-size: 8.5pt !important;
    font-family: Arial, Helvetica, sans-serif !important;
    margin-bottom: 14px !important;
    letter-spacing: 0 !important;
    word-spacing: 0 !important;
  }
  .rt thead { display: table-header-group !important; }
  .rt tfoot { display: table-footer-group !important; }
  .rt thead tr { background: #1a5c2a !important; }
  .rt thead th {
    color: #fff !important; font-weight: bold !important;
    font-size: 8pt !important; padding: 7px 9px !important;
    text-align: center !important; border: 0.5pt solid #0d3d1a !important;
    text-transform: uppercase !important;
    vertical-align: middle !important;
    white-space: nowrap !important;
  }
  .rt thead th.tl { text-align: left !important; }
  .rt tbody tr { page-break-inside: avoid !important; }
  .rt tbody tr:nth-child(odd)  { background: #fff !important; }
  .rt tbody tr:nth-child(even) { background: #f5faf5 !important; }
  .rt tbody td {
    padding: 6px 9px !important;
    border: 0.5pt solid #c8d8c8 !important;
    color: #111 !important; font-size: 8.5pt !important;
    vertical-align: middle !important;
    letter-spacing: 0 !important;
  }
  .rt tbody td.tc { text-align: center !important; }
  .rt tbody td.tr { text-align: right !important; }
  .rt tbody td.bold { font-weight: bold !important; }
  .rt tfoot tr { background: #e8f5e9 !important; }
  .rt tfoot td {
    padding: 7px 9px !important; font-weight: bold !important;
    font-size: 9pt !important; color: #1a5c2a !important;
    border: 0.5pt solid #a8c8a8 !important;
    border-top: 2pt solid #1a5c2a !important;
  }
  /* ── STATUTS ── */
  .s-prevu   { color: #1565C0 !important; font-weight: bold !important; }
  .s-encours { color: #E65100 !important; font-weight: bold !important; }
  .s-termine { color: #1a5c2a !important; font-weight: bold !important; }
  .s-annule  { color: #B71C1C !important; font-weight: bold !important; }
  .s-oui     { color: #1a5c2a !important; font-weight: bold !important; }
  .s-non     { color: #B71C1C !important; }
  /* ── FOOTER ── */
  .print-footer {
    position: fixed !important; bottom: 5mm !important;
    left: 14mm !important; right: 14mm !important;
    border-top: 1pt solid #1a5c2a !important;
    padding-top: 4px !important;
    display: flex !important;
    justify-content: space-between !important;
    align-items: center !important;
    font-size: 7.5pt !important; color: #666 !important;
  }
  .print-footer .fl { color: #1a5c2a !important; font-weight: bold !important; }
  .print-footer .fc { font-style: italic !important; color: #888 !important; }
  @counter-style page-counter { system: numeric; symbols: '0' '1' '2' '3' '4' '5' '6' '7' '8' '9'; }
  .pnum::before { content: counter(page); }
  .page-break { page-break-before: always !important; }
  .no-break   { page-break-inside: avoid !important; }
  /* ── NOTES BAS ── */
  .report-note {
    font-size: 8pt !important; color: #777 !important;
    font-style: italic !important; margin-top: 4px !important;
    border-left: 3pt solid #c8102e !important;
    padding-left: 6px !important;
  }
}

/* Aperçu écran fenêtre impression */
html, body { margin: 0; padding: 0; background: #fff; color: #111; font-family: Arial, Helvetica, sans-serif; font-size: 10pt; }
.print-doc { max-width: 186mm; margin: 0 auto; padding: 12px 0 24mm; }
.ph { display: flex; align-items: center; gap: 16px; padding-bottom: 10px; border-bottom: 4px solid #1a5c2a; margin-bottom: 4px; }
.ph img { width: 80px; height: auto; }
.ph-org { flex: 1; }
.ph-org-name { font-size: 13pt; font-weight: bold; color: #1a5c2a; text-transform: uppercase; margin: 0; }
.ph-org-sub { font-size: 10pt; font-weight: bold; color: #8B6914; margin: 2px 0 0; text-transform: uppercase; }
.ph-org-ar { font-size: 9pt; color: #777; margin-top: 3px; direction: rtl; }
.ph-meta { text-align: right; font-size: 8pt; color: #666; line-height: 1.6; }
.ph-meta-gen { text-transform: uppercase; letter-spacing: 0.02em; }
.ph-meta strong { color: #1a5c2a; }
.gold-line { height: 2px; background: #8B6914; margin: 6px 0 14px; }
.report-title-block { background: #f0f7f0; border-left: 5px solid #c8102e; padding: 10px 16px; margin-bottom: 14px; }
.report-title-block h1 { font-size: 15pt; font-weight: bold; color: #1a5c2a; margin: 0; text-transform: uppercase; }
.report-title-block p { font-size: 9pt; color: #555; margin: 4px 0 0; }
.kpi-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 16px; }
.kpi-box { border: 0.5pt solid #1a5c2a; border-top: 3pt solid #1a5c2a; padding: 8px; text-align: center; background: #f8fdf8; }
.kpi-label { display: block; font-size: 7pt; text-transform: uppercase; color: #666; margin-bottom: 4px; }
.kpi-value { display: block; font-size: 20pt; font-weight: bold; color: #1a5c2a; line-height: 1; }
.kpi-sub { display: block; font-size: 7pt; color: #999; margin-top: 3px; }
.meta-box { border: 0.5pt solid #d0d8d0; border-left: 4pt solid #8B6914; background: #fffdf5; padding: 7px 12px; margin-bottom: 14px; font-size: 8.5pt; }
.meta-box table { width: 100%; border: none; margin: 0; }
.meta-box td { border: none; padding: 2px 8px 2px 0; color: #333; font-size: 8.5pt; }
.meta-box td:first-child { font-weight: bold; color: #555; width: 30%; white-space: nowrap; }
.section-title { font-size: 10.5pt; font-weight: bold; color: #1a5c2a; text-transform: uppercase; border-bottom: 2pt solid #c8102e; padding-bottom: 4px; margin: 16px 0 8px; }
.rt { width: 100%; border-collapse: collapse; font-size: 8.5pt; margin-bottom: 14px; }
.rt thead tr { background: #1a5c2a; }
.rt thead th { color: #fff; font-weight: bold; font-size: 8pt; padding: 7px 9px; text-align: center; border: 0.5pt solid #0d3d1a; text-transform: uppercase; }
.rt thead th.tl { text-align: left; }
.rt tbody tr:nth-child(even) { background: #f5faf5; }
.rt tbody td { padding: 6px 9px; border: 0.5pt solid #c8d8c8; font-size: 8.5pt; }
.rt tbody td.tc { text-align: center; }
.rt tbody td.tr { text-align: right; }
.rt tbody td.bold { font-weight: bold; }
.rt tfoot tr { background: #e8f5e9; }
.rt tfoot td { padding: 7px 9px; font-weight: bold; color: #1a5c2a; border: 0.5pt solid #a8c8a8; border-top: 2pt solid #1a5c2a; }
.s-prevu { color: #1565C0; font-weight: bold; }
.s-encours { color: #E65100; font-weight: bold; }
.s-termine { color: #1a5c2a; font-weight: bold; }
.s-annule { color: #B71C1C; font-weight: bold; }
.s-oui { color: #1a5c2a; font-weight: bold; }
.s-non { color: #B71C1C; }
.report-note { font-size: 8pt; color: #777; font-style: italic; margin-top: 4px; border-left: 3pt solid #c8102e; padding-left: 6px; }
.print-footer { border-top: 1pt solid #1a5c2a; padding-top: 8px; margin-top: 24px; display: flex; justify-content: space-between; font-size: 7.5pt; color: #666; }
.print-footer .fl { color: #1a5c2a; font-weight: bold; }
.print-footer .fc { font-style: italic; color: #888; }
${PRINT_LOGO_CSS}
`;
}
