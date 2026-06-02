"use client";

import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { FRMTPdfEngine } from "@/lib/pdf/pdfEngine";
import { safePdfCell } from "@/lib/pdf/pdf-format";
import { loadPdfLogoBase64 } from "@/lib/pdf/load-pdf-logo";

function cols(rows: Record<string, string>[]) {
  return Object.keys(rows[0] ?? { info: "—" });
}

export async function generateRapportMensuelPDF(
  mois: number,
  annee: number,
  data: {
    stages: Record<string, string>[];
    participants: Record<string, string>[];
    occupation: Record<string, string>[];
    financier?: Record<string, string>[];
  }
): Promise<void> {
  const logo = await loadPdfLogoBase64();
  const label = format(new Date(annee, mois - 1, 1), "MMMM yyyy", { locale: fr });
  const engine = new FRMTPdfEngine(`Rapport mensuel — ${label}`);

  engine.drawHeader({
    documentType: "RAPPORT MENSUEL",
    stageName: label,
    date: `Généré le ${format(new Date(), "d MMMM yyyy", { locale: fr })}`,
    logoBase64: logo,
  });

  const addSection = (title: string, rows: Record<string, string>[]) => {
    if (!rows.length) return;
    const keys = cols(rows);
    engine.sectionTitle(title);
    engine.table({
      headers: keys,
      rows: rows.map((r) => keys.map((k) => safePdfCell(r[k]))),
      colWidths: keys.map(() => 182 / keys.length),
    });
  };

  addSection("Synthèse stages", data.stages);
  addSection("Synthèse participants", data.participants);
  addSection("Occupation installations", data.occupation);
  if (data.financier?.length) addSection("Synthèse financière", data.financier);

  engine.save(`rapport-mensuel-${annee}-${mois}.pdf`);
}
