"use client";

import { FRMTPdfEngine } from "@/lib/pdf/pdfEngine";
import { buildPdfFilename, formatDateFR, safePdfCell } from "@/lib/pdf/pdf-format";
import { loadPdfLogoBase64 } from "@/lib/pdf/load-pdf-logo";

export async function generateFicheEntraineurPDF(
  entraineurs: Record<string, string>[]
): Promise<void> {
  const logo = await loadPdfLogoBase64();
  const keys = Object.keys(entraineurs[0] ?? { nom: "Nom", prenom: "Prénom" });
  const engine = new FRMTPdfEngine("Liste des entraîneurs");

  engine.drawHeader({
    documentType: "FICHE ENTRAÎNEURS",
    stageName: "Encadrement national",
    date: `Généré le ${formatDateFR(new Date().toISOString())}`,
    logoBase64: logo,
  });

  engine.kpiRow([
    { label: "Entraîneurs", value: String(entraineurs.length), color: "#276749" },
  ]);

  engine.sectionTitle("Effectif encadrants");
  engine.table({
    headers: keys,
    rows: (entraineurs.length ? entraineurs : [{}]).map((r) =>
      keys.map((k) => safePdfCell(r[k]))
    ),
    colWidths: keys.map(() => 182 / Math.max(keys.length, 1)),
  });

  engine.save("entraineurs.pdf");
}
