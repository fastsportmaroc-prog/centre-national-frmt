import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  BRAND_CENTRE,
  BRAND_FRMT,
  FEDERATION_NAME,
  FRMT_GREEN,
  FRMT_RED,
  REPORT_FOOTER,
} from "@/lib/constants/branding";

export type ReportMeta = {
  titre: string;
  sousTitre?: string;
  filtres?: string;
  colonnes: string[];
  lignes: string[][];
};

const REPORT_HEADER_STYLES = `
    body{font-family:system-ui,sans-serif;background:#fff;color:#111;padding:40px}
    .report-header{display:flex;align-items:center;gap:24px;margin-bottom:16px;padding-bottom:16px;border-bottom:2px solid ${FRMT_GREEN}}
    .brand-frmt{font-size:26px;font-weight:900;color:${FRMT_RED};letter-spacing:0.06em;margin:0;line-height:1}
    .brand-centre{font-size:13px;font-weight:700;color:${FRMT_GREEN};letter-spacing:0.1em;margin:6px 0 0;text-transform:uppercase}
    .report-brand .fed{font-size:11px;margin:8px 0 0;color:#444;max-width:360px;line-height:1.4}
    h2.report-title{margin:20px 0 4px;font-size:18px;color:#111}
    .meta{color:#666;font-size:13px;margin-bottom:24px}
    table{border-collapse:collapse;width:100%;font-size:12px}
    th{background:${FRMT_GREEN}!important;color:#fff!important}
    td{border:1px solid #ccc;padding:8px}
    .footer{margin-top:40px;font-size:11px;color:#888;border-top:1px solid #ddd;padding-top:12px}
    .sig{margin-top:48px}.sig-line{border-top:1px solid #333;width:200px;margin-top:40px}
    @media print{
      body{padding:20px}
    }
`;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function reportBrandBlockHtml(): Promise<string> {
  return `
  <div class="report-header">
    <div style="width:72px;height:72px;border:2px dashed ${FRMT_GREEN};border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:#666;text-align:center;line-height:1.2">Logo officiel<br/>à intégrer</div>
    <div class="report-brand">
      <p class="brand-frmt">${escapeHtml(BRAND_FRMT)}</p>
      <p class="brand-centre">${escapeHtml(BRAND_CENTRE)}</p>
      <p class="fed">${escapeHtml(FEDERATION_NAME)}</p>
    </div>
  </div>`;
}

export async function buildReportHtml(meta: ReportMeta): Promise<string> {
  const dateGen = format(new Date(), "dd MMMM yyyy à HH:mm", { locale: fr });
  const brand = await reportBrandBlockHtml();
  const rows = (meta.lignes ?? [])
    .map(
      (cells) =>
        `<tr>${cells.map((c) => `<td>${escapeHtml(c)}</td>`).join("")}</tr>`
    )
    .join("");
  const headers = meta.colonnes
    .map((c) => `<th>${escapeHtml(c)}</th>`)
    .join("");

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8"/>
  <title>${escapeHtml(meta.titre)} — ${escapeHtml(BRAND_FRMT)}</title>
  <style>${REPORT_HEADER_STYLES}</style>
</head>
<body>
  ${brand}
  <h2 class="report-title">${escapeHtml(meta.titre)}</h2>
  ${meta.sousTitre ? `<p>${escapeHtml(meta.sousTitre)}</p>` : ""}
  <p class="meta">Généré le ${dateGen}${meta.filtres ? ` · Filtres : ${escapeHtml(meta.filtres)}` : ""}</p>
  <table><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table>
  <div class="sig">
    <p>Signature responsable :</p>
    <div class="sig-line"></div>
  </div>
  <p class="footer">${escapeHtml(REPORT_FOOTER)}</p>
  <script>window.onload=function(){window.print()}</script>
</body>
</html>`;
}

export function exportCsv(filename: string, colonnes: string[], lignes: string[][]) {
  const bom = "\uFEFF";
  const headerLine = `# ${BRAND_FRMT} — ${BRAND_CENTRE} — ${FEDERATION_NAME}`;
  const header = colonnes.map(escapeCsv).join(";");
  const body = lignes.map((row) => row.map(escapeCsv).join(";")).join("\n");
  const blob = new Blob([bom + headerLine + "\n" + header + "\n" + body], {
    type: "text/csv;charset=utf-8",
  });
  downloadBlob(blob, filename.endsWith(".csv") ? filename : `${filename}.csv`);
}

function escapeCsv(v: string): string {
  if (v.includes(";") || v.includes('"') || v.includes("\n")) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function openPrintReport(meta: ReportMeta): Promise<void> {
  const html = await buildReportHtml(meta);
  const w = window.open("", "_blank");
  if (!w) {
    alert("Autorisez les pop-ups pour imprimer le rapport.");
    return;
  }
  w.document.write(html);
  w.document.close();
}

function isReportMeta(value: unknown): value is ReportMeta {
  return (
    typeof value === "object" &&
    value !== null &&
    "titre" in value &&
    "colonnes" in value &&
    Array.isArray((value as ReportMeta).colonnes)
  );
}

/**
 * Export PDF (impression navigateur).
 * Accepte `(filename, meta)` ou `(meta, filename)` pour compatibilité.
 */
export async function exportPdfReport(
  first: string | ReportMeta,
  second?: string | ReportMeta
): Promise<void> {
  let meta: ReportMeta;
  if (isReportMeta(first)) {
    meta = first;
  } else if (isReportMeta(second)) {
    meta = second;
  } else {
    throw new Error("exportPdfReport : ReportMeta manquant");
  }
  await openPrintReport(meta);
}
