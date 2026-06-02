"use client";

import { FRMTPdfEngine } from "@/lib/pdf/pdfEngine";
import { formatDateFR, safePdfCell } from "@/lib/pdf/pdf-format";
import { loadPdfLogoBase64 } from "@/lib/pdf/load-pdf-logo";

export async function generatePasseportsPDF(rows: Record<string, string>[]): Promise<void> {
  const logo = await loadPdfLogoBase64();
  const keys = Object.keys(rows[0] ?? { nom: "Nom" });
  const engine = new FRMTPdfEngine("Documents officiels");

  engine.drawHeader({
    documentType: "DOCUMENTS OFFICIELS",
    stageName: "Passeports et pièces",
    subtitle: "Pour soumission aux autorités compétentes",
    date: `Généré le ${formatDateFR(new Date().toISOString())}`,
    logoBase64: logo,
  });

  engine.sectionTitle("Liste");
  engine.table({
    headers: keys,
    rows: (rows.length ? rows : [{}]).map((r) => keys.map((k) => safePdfCell(r[k]))),
    colWidths: keys.map(() => 182 / Math.max(keys.length, 1)),
  });

  engine.save("passeports.pdf");
}
