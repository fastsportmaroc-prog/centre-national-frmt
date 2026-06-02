"use client";

import { FRMTPdfEngine } from "@/lib/pdf/pdfEngine";
import { formatDateFR, formatStatutPdf, safePdfCell } from "@/lib/pdf/pdf-format";
import { loadPdfLogoBase64 } from "@/lib/pdf/load-pdf-logo";

export type PlanningPdfSeance = {
  date: string;
  jour?: string;
  creneau?: string;
  horaire?: string;
  heure_debut?: string;
  heure_fin?: string;
  stage?: string;
  categorie?: string;
  statut: string;
  nombre_joueurs?: number;
  nombre_coachs?: number;
  hebergement?: string;
  restauration?: string;
  terrains?: string;
  terrains_supplementaires?: string;
  lettre_envoyee?: string;
  licences_verifiees?: string;
};

export async function generatePlanningPDF(
  seances: PlanningPdfSeance[],
  options?: string | {
    weekLabel?: string;
    generatedBy?: string;
    summary?: {
      totalSeances: number;
      stagesActifs: number;
      totalJoueurs: number;
      totalCoachs: number;
      creneauxMatin: number;
      creneauxApresMidi: number;
    };
  }
): Promise<void> {
  const logo = await loadPdfLogoBase64();
  const optsObj = typeof options === "string" ? { weekLabel: options } : options;
  const generatedBy = optsObj?.generatedBy ?? "Utilisateur FRMT";

  const rows = [...seances]
    .sort((a, b) =>
      `${a.date}${a.horaire ?? a.heure_debut ?? ""}`.localeCompare(
        `${b.date}${b.horaire ?? b.heure_debut ?? ""}`
      )
    )
    .map((r) => [
      formatDateFR(r.date),
      safePdfCell(r.jour),
      safePdfCell(r.creneau),
      safePdfCell(r.horaire ?? `${r.heure_debut ?? "—"} – ${r.heure_fin ?? "—"}`),
      safePdfCell(r.stage),
      safePdfCell(r.categorie),
      formatStatutPdf(r.statut ?? "prevu"),
      String(r.nombre_joueurs ?? 0),
      String(r.nombre_coachs ?? 0),
      safePdfCell(r.hebergement ?? "Non"),
      safePdfCell(r.restauration ?? "Non"),
      safePdfCell(r.terrains ?? "Non"),
      safePdfCell(r.terrains_supplementaires ?? "Non"),
      safePdfCell(r.lettre_envoyee ?? "Non"),
      safePdfCell(r.licences_verifiees ?? "Non"),
    ]);

  const engine = new FRMTPdfEngine("Planning hebdomadaire", "landscape");
  engine.drawHeader({
    documentType: "PLANNING DES SÉANCES",
    stageName: "Centre National FRMT",
    subtitle: optsObj?.weekLabel ?? "Semaine en cours",
    date: `Export ${formatDateFR(new Date().toISOString())} · ${generatedBy}`,
    logoBase64: logo,
  });

  if (optsObj?.summary) {
    const s = optsObj.summary;
    engine.kpiRow([
      { label: "Séances", value: String(s.totalSeances), color: "#2B6CB0" },
      { label: "Stages", value: String(s.stagesActifs), color: "#276749" },
      { label: "Joueurs", value: String(s.totalJoueurs), color: "#2D3748" },
      { label: "Coachs", value: String(s.totalCoachs), color: "#718096" },
    ]);
    engine.sectionTitle("Résumé hebdomadaire");
    engine.table({
      headers: ["Indicateur", "Valeur"],
      colWidths: [120, 62],
      rows: [
        ["Créneaux matin", String(s.creneauxMatin)],
        ["Créneaux après-midi", String(s.creneauxApresMidi)],
      ],
    });
  }

  engine.sectionTitle("Séances");
  engine.table({
    headers: [
      "Date",
      "Jour",
      "Créneau",
      "Horaire",
      "Stage",
      "Cat.",
      "Statut",
      "J.",
      "C.",
      "Héb.",
      "Rest.",
      "Terr.",
      "T.supp",
      "Lettre",
      "Lic.",
    ],
    colWidths: [16, 12, 16, 16, 22, 10, 12, 8, 8, 8, 8, 8, 10, 8, 8],
    statusColIndex: 6,
    rows: rows.length ? rows : [["—"]],
  });

  engine.save(`Planning_Hebdomadaire_${new Date().toISOString().slice(0, 10)}.pdf`.replace(/\s+/g, "_"));
}
