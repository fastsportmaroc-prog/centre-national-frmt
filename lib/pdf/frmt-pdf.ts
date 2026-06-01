/** @deprecated Utiliser lib/pdf/pdfGenerator.ts et lib/pdf/pdf-exports.ts */
export {
  exportStagePDF as exportStagePdf,
  exportJoueursPDF,
  exportEntraineursPDF,
  exportReservationsPDF,
  exportBilletsPdf,
  exportBilletsPDF,
  exportCalendrierPDF,
  exportPlanningPDF,
  exportHebergementPDF,
  exportRestaurationPDF,
  exportPasseportsPDF,
  exportLogistiquePDF,
  exportRapportMensuelPDF,
  exportListePdf,
  exportBudgetVoyagePDF,
  exportBudgetMissionPDF,
} from "@/lib/pdf/pdf-exports";

export { generatePDF, savePDF, generateFRMTPDF, FRMT } from "@/lib/pdf/pdfGenerator";
export type {
  PdfColumn,
  PdfSection,
  GeneratePdfOptions,
  PDFConfig,
} from "@/lib/pdf/pdfGenerator";

import type { ReportMeta } from "@/lib/export/reports";
import { generateFRMTPDF } from "@/lib/pdf/pdfGenerator";

export type PdfTableRow = (string | number)[];

export type FrmtPdfOptions = {
  title: string;
  subtitle?: string;
  sections?: { heading: string; rows: PdfTableRow[]; headers?: string[] }[];
  tableHeaders?: string[];
  tableRows?: PdfTableRow[];
  showSignataires?: boolean;
  filename: string;
  orientation?: "portrait" | "landscape";
};

export function buildFrmtReportMeta(
  titre: string,
  colonnes: string[],
  lignes: string[][],
  options?: Pick<ReportMeta, "sousTitre" | "filtres">
): ReportMeta {
  return { titre, colonnes, lignes, ...options };
}

export async function exportFrmtPdfFromMeta(
  meta: ReportMeta,
  filename: string,
  legacyPrintStyle = meta.legacyPrintStyle ?? false
): Promise<void> {
  const pdfSections = [
    ...(meta.sections ?? []).map((s) => ({
      heading: s.title ?? "Section",
      headers: s.colonnes,
      rows: [...s.lignes, ...(s.footer ?? [])],
    })),
    ...(meta.recap
      ? [
          {
            heading: meta.recap.title ?? "Récapitulatif",
            headers: meta.recap.colonnes,
            rows: [...meta.recap.lignes, ...(meta.recap.footer ?? [])],
          },
        ]
      : []),
  ];

  const extraSections: { title: string; content: string }[] = [];
  if (meta.kpis?.length) {
    extraSections.push({
      title: "Indicateurs clés",
      content: meta.kpis.map((k) => `${k.label} : ${k.value}${k.sub ? ` (${k.sub})` : ""}`).join("\n"),
    });
  }
  if (meta.observations) {
    extraSections.push({ title: "Observations", content: meta.observations });
  }

  const hasMainTable = meta.colonnes.length > 0 && meta.lignes.length > 0;
  const outName = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;

  await generateFRMTPDF({
    title: meta.titre,
    subtitle: meta.sousTitre ?? meta.filtres,
    columns: hasMainTable ? meta.colonnes.map((h, i) => ({ header: h, key: `c${i}` })) : [],
    data: hasMainTable
      ? [...meta.lignes, ...(meta.footer ?? [])].map((row) =>
          Object.fromEntries(row.map((cell, i) => [`c${i}`, String(cell)]))
        )
      : [],
    sections: pdfSections.map((s) => ({
      title: s.heading,
      columns: (s.headers ?? ["Colonne"]).map((h, i) => ({ header: h, key: `c${i}` })),
      data: s.rows.map((row) =>
        Object.fromEntries(row.map((cell, i) => [`c${i}`, String(cell)]))
      ),
    })),
    extraSections,
    showSignataires: false,
    legacyTableStyle: legacyPrintStyle,
    filename: outName,
  });
}

export function exportFrmtPdf(opts: FrmtPdfOptions): void {
  void generateFRMTPDF({
    title: opts.title,
    subtitle: opts.subtitle,
    columns: opts.tableHeaders?.map((h, i) => ({ header: h, key: `c${i}` })),
    data:
      opts.tableRows?.map((row) =>
        Object.fromEntries(row.map((cell, i) => [`c${i}`, String(cell)]))
      ) ?? [],
    sections: opts.sections?.map((s) => ({
      title: s.heading,
      columns: (s.headers ?? ["Colonne"]).map((h, i) => ({ header: h, key: `c${i}` })),
      data: s.rows.map((row) =>
        Object.fromEntries(row.map((cell, i) => [`c${i}`, String(cell)]))
      ),
    })),
    showSignataires: opts.showSignataires,
    orientation: opts.orientation,
    filename: opts.filename,
  }).catch((e) => console.error("[PDF] export failed:", e));
}
