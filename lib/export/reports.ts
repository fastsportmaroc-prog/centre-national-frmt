import { FEDERATION_NAME } from "@/lib/constants/branding";
import { buildInstitutionalPrintHtml } from "@/lib/print/print-layout-html";
import { enrichReportMeta } from "@/lib/print/report-enrich";

export type ReportKpi = {
  label: string;
  value: string;
  sub?: string;
};

export type ReportTableSection = {
  title?: string;
  colonnes: string[];
  lignes: string[][];
  footer?: string[][];
  headerAlign?: ("left" | "center" | "right")[];
  cellAlign?: ("left" | "center" | "right")[];
};

export type ReportMeta = {
  titre: string;
  sousTitre?: string;
  filtres?: string;
  colonnes: string[];
  lignes: string[][];
  /** Titre de la section du tableau principal */
  mainTableTitle?: string;
  footer?: string[][];
  headerAlign?: ("left" | "center" | "right")[];
  cellAlign?: ("left" | "center" | "right")[];
  metaRows?: { label: string; value: string }[][];
  kpis?: ReportKpi[];
  sections?: ReportTableSection[];
  recap?: ReportTableSection;
  observations?: string;
  generatedBy?: string;
  generatedRole?: string;
  reference?: string;
  periodeLabel?: string;
  statutFiltre?: string;
  /** Conserve le style vert historique (budget administratif uniquement) */
  legacyPrintStyle?: boolean;
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function buildReportHtml(meta: ReportMeta): Promise<string> {
  const enriched = enrichReportMeta(meta);
  return buildInstitutionalPrintHtml(enriched, enriched.legacyPrintStyle);
}

export function exportCsv(filename: string, colonnes: string[], lignes: string[][]) {
  const bom = "\uFEFF";
  const headerLine = `# ${FEDERATION_NAME}`;
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
  const enriched = enrichReportMeta(meta);
  const slug = enriched.titre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  const filename = `${slug || "rapport"}.pdf`;
  await exportPdfReport(enriched, filename);
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
 * Export PDF via jsPDF (fichier .pdf téléchargeable).
 */
export async function exportPdfReport(
  first: string | ReportMeta,
  second?: string | ReportMeta
): Promise<void> {
  let meta: ReportMeta;
  let filename: string;
  if (isReportMeta(first)) {
    meta = first;
    filename = typeof second === "string" ? second : "rapport.pdf";
  } else if (isReportMeta(second)) {
    meta = second;
    filename = first;
  } else {
    throw new Error("exportPdfReport : ReportMeta manquant");
  }
  const { exportFrmtPdfFromMeta } = await import("@/lib/pdf/frmt-pdf");
  await exportFrmtPdfFromMeta(enrichReportMeta(meta), filename, meta.legacyPrintStyle);
}
