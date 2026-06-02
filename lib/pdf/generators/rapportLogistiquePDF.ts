"use client";

import { FRMTPdfEngine } from "@/lib/pdf/pdfEngine";
import { buildPdfFilename, formatDateFR, safePdfCell } from "@/lib/pdf/pdf-format";
import { loadPdfLogoBase64 } from "@/lib/pdf/load-pdf-logo";

export async function generateLogistiquePDF(rows: Record<string, string>[]): Promise<void> {
  const logo = await loadPdfLogoBase64();
  const keys = Object.keys(rows[0] ?? { stage: "Stage" });
  const engine = new FRMTPdfEngine("Demandes logistiques");

  engine.drawHeader({
    documentType: "RAPPORT LOGISTIQUE",
    stageName: "Demandes et suivi",
    date: `Généré le ${formatDateFR(new Date().toISOString())}`,
    logoBase64: logo,
  });

  engine.sectionTitle("Demandes");
  engine.table({
    headers: keys,
    rows: (rows.length ? rows : [{}]).map((r) => keys.map((k) => safePdfCell(r[k]))),
    colWidths: keys.map(() => 182 / Math.max(keys.length, 1)),
  });

  engine.save("logistique.pdf");
}

export async function generateStagesLogistiquePDF(params: {
  periodeLabel: string;
  rows: {
    stage: string;
    categorie: string;
    dates: string;
    duree: string;
    joueurs: string;
    coachs: string;
    chambres: string;
    hebergement: string;
    terrains: string;
  }[];
  totals: { joueurs: number; coachs: number; chambres: number };
}): Promise<void> {
  const logo = await loadPdfLogoBase64();
  const engine = new FRMTPdfEngine("Planification logistique", "landscape");

  engine.drawHeader({
    documentType: "PLANIFICATION LOGISTIQUE",
    stageName: "CENTRE NATIONAL FRMT",
    subtitle: params.periodeLabel,
    date: `Export le ${formatDateFR(new Date().toISOString())}`,
    logoBase64: logo,
  });

  engine.kpiRow([
    { label: "Joueurs", value: String(params.totals.joueurs), color: "#2B6CB0" },
    { label: "Coachs", value: String(params.totals.coachs), color: "#276749" },
    { label: "Chambres", value: String(params.totals.chambres), color: "#B7791F" },
  ]);

  engine.sectionTitle("Stages");
  engine.table({
    headers: ["Stage", "Cat.", "Dates", "Durée", "Joueurs", "Coachs", "Chambres", "Héb.", "Terr."],
    colWidths: [40, 14, 36, 12, 14, 14, 14, 12, 12],
    rows: (
      params.rows.length ?
        params.rows
      : [
          {
            stage: "—",
            categorie: "—",
            dates: "—",
            duree: "—",
            joueurs: "0",
            coachs: "0",
            chambres: "0",
            hebergement: "Non",
            terrains: "Non",
          },
        ]
    ).map((r) => [
      r.stage,
      r.categorie,
      r.dates,
      r.duree,
      r.joueurs,
      r.coachs,
      r.chambres,
      r.hebergement,
      r.terrains,
    ]),
  });

  engine.save(
    buildPdfFilename("LOGISTIQUE-STAGES", "planification", new Date().toISOString().slice(0, 10))
  );
}
