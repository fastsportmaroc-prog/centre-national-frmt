"use client";

import { FRMTPdfEngine } from "@/lib/pdf/pdfEngine";
import { formatDateFR, safePdfCell } from "@/lib/pdf/pdf-format";
import { loadPdfLogoBase64 } from "@/lib/pdf/load-pdf-logo";

export async function generateBilanStagePDF(params: {
  title: string;
  rows: (string | number)[][];
  filename: string;
  subtitle?: string;
}): Promise<void> {
  const logo = await loadPdfLogoBase64();
  const engine = new FRMTPdfEngine(params.title);

  engine.drawHeader({
    documentType: "BILAN DE STAGE",
    stageName: params.title.replace(/^BILAN DE STAGE — /i, "").slice(0, 60),
    subtitle: params.subtitle,
    date: `Généré le ${formatDateFR(new Date().toISOString())}`,
    logoBase64: logo,
  });

  engine.sectionTitle("Synthèse");
  engine.table({
    headers: ["Section", "Valeur"],
    colWidths: [70, 112],
    rows: params.rows.map((r) => [String(r[0] ?? "—"), String(r[1] ?? "—")]),
  });

  engine.save(params.filename);
}
