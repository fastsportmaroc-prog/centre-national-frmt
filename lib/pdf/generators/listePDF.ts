"use client";

import { FRMTPdfEngine } from "@/lib/pdf/pdfEngine";
import { formatDateFR } from "@/lib/pdf/pdf-format";
import { loadPdfLogoBase64 } from "@/lib/pdf/load-pdf-logo";

export async function generateListePDF(params: {
  title: string;
  headers: string[];
  rows: (string | number)[][];
  filename: string;
}): Promise<void> {
  const logo = await loadPdfLogoBase64();
  const engine = new FRMTPdfEngine(params.title);

  engine.drawHeader({
    documentType: "LISTE",
    stageName: params.title.slice(0, 80),
    date: `Généré le ${formatDateFR(new Date().toISOString())}`,
    logoBase64: logo,
  });

  const n = Math.max(params.headers.length, 1);
  const colW = 182 / n;

  engine.sectionTitle("Contenu");
  engine.table({
    headers: params.headers,
    rows: params.rows.map((r) =>
      params.headers.map((_, i) => String(r[i] ?? "—"))
    ),
    colWidths: params.headers.map(() => colW),
  });

  engine.save(params.filename);
}
