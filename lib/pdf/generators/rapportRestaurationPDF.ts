"use client";

import { FRMTPdfEngine } from "@/lib/pdf/pdfEngine";
import { formatDateFR, safePdfCell } from "@/lib/pdf/pdf-format";
import { loadPdfLogoBase64 } from "@/lib/pdf/load-pdf-logo";

export async function generateRapportRestaurationPDF(
  rows: Record<string, string>[],
  totals?: Record<string, string>,
  stageName?: string
): Promise<void> {
  const logo = await loadPdfLogoBase64();
  const keys = Object.keys(rows[0] ?? { date: "Date" });
  const engine = new FRMTPdfEngine("Rapport restauration");

  engine.drawHeader({
    documentType: "RAPPORT RESTAURATION",
    stageName: stageName ?? "Centre National",
    date: `Généré le ${formatDateFR(new Date().toISOString())}`,
    logoBase64: logo,
  });

  engine.kpiRow([
    { label: "Repas lignes", value: String(rows.length), color: "#B7791F" },
    { label: "Stage", value: safePdfCell(stageName), color: "#2D3748" },
  ]);

  engine.sectionTitle("Détail par jour");
  engine.table({
    headers: keys,
    rows: (rows.length ? rows : [{}]).map((r) => keys.map((k) => safePdfCell(r[k]))),
    colWidths: keys.map(() => 182 / Math.max(keys.length, 1)),
  });

  if (totals && Object.keys(totals).length) {
    const tKeys = Object.keys(totals);
    engine.sectionTitle("Totaux");
    engine.table({
      headers: tKeys,
      rows: [tKeys.map((k) => safePdfCell(totals[k]))],
      colWidths: tKeys.map(() => 182 / tKeys.length),
    });
  }

  engine.save("restauration.pdf");
}
