"use client";

import { FRMTPdfEngine } from "@/lib/pdf/pdfEngine";
import { formatDateFR, safePdfCell } from "@/lib/pdf/pdf-format";
import { loadPdfLogoBase64 } from "@/lib/pdf/load-pdf-logo";

export async function generateRapportHebergementPDF(
  rows: Record<string, string>[],
  stageName?: string
): Promise<void> {
  const logo = await loadPdfLogoBase64();
  const keys = Object.keys(rows[0] ?? { stage: "Stage" });
  const engine = new FRMTPdfEngine("Rapport hébergement");

  engine.drawHeader({
    documentType: "RAPPORT HÉBERGEMENT",
    stageName: stageName ?? "Centre National",
    date: `Généré le ${formatDateFR(new Date().toISOString())}`,
    logoBase64: logo,
  });

  engine.kpiRow([
    { label: "Lignes", value: String(rows.length), color: "#2B6CB0" },
    { label: "Stage", value: safePdfCell(stageName), color: "#276749" },
  ]);

  engine.sectionTitle("Détail hébergement");
  engine.table({
    headers: keys,
    rows: (rows.length ? rows : [{}]).map((r) => keys.map((k) => safePdfCell(r[k]))),
    colWidths: keys.map(() => 182 / Math.max(keys.length, 1)),
  });

  const filename = `Hebergement_${(stageName ?? "Centre_National").replace(/\s+/g, "_")}.pdf`;
  engine.save(filename);
}
