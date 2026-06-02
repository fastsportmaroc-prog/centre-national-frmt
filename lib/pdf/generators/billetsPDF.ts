"use client";

import { FRMTPdfEngine } from "@/lib/pdf/pdfEngine";
import { formatMoneyMAD, safePdfCell } from "@/lib/pdf/pdf-format";
import { loadPdfLogoBase64 } from "@/lib/pdf/load-pdf-logo";

export async function generateBilletsPDF(
  rows: Record<string, string>[],
  totalMad: number,
  stageName?: string
): Promise<void> {
  const logo = await loadPdfLogoBase64();
  const keys = Object.keys(rows[0] ?? { nom: "Nom" });
  const engine = new FRMTPdfEngine("Billets d'avion");

  engine.drawHeader({
    documentType: "BILLETS D'AVION",
    stageName: stageName ?? "Demandes",
    logoBase64: logo,
  });

  engine.kpiRow([
    { label: "Billets", value: String(rows.length), color: "#2B6CB0" },
    { label: "Total MAD", value: formatMoneyMAD(totalMad), color: "#C53030" },
  ]);

  engine.sectionTitle("Demandes");
  engine.table({
    headers: keys,
    rows: (rows.length ? rows : [{}]).map((r) => keys.map((k) => safePdfCell(r[k]))),
    colWidths: keys.map(() => 182 / Math.max(keys.length, 1)),
  });

  engine.save("billets-avion.pdf");
}
