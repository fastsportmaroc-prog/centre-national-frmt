"use client";

import { FRMTPdfEngine } from "@/lib/pdf/pdfEngine";
import {
  ageFromBirthdate,
  buildPdfFilename,
  formatDateFR,
  formatStatutPdf,
  safePdfCell,
} from "@/lib/pdf/pdf-format";
import { loadPdfLogoBase64 } from "@/lib/pdf/load-pdf-logo";

const JOUEUR_KEYS = ["num", "nom", "prenom", "sexe", "categorie", "naissance", "age", "club", "statut"] as const;

export async function generateFicheJoueurPDF(
  joueurs: Record<string, string>[],
  filtres?: string
): Promise<void> {
  const logo = await loadPdfLogoBase64();
  const engine = new FRMTPdfEngine("Liste des joueurs", "landscape");
  engine.drawHeader({
    documentType: "FICHE JOUEURS",
    stageName: "Effectif national",
    subtitle: filtres ? `Filtres : ${filtres}` : "Centre National FRMT",
    date: `Généré le ${formatDateFR(new Date().toISOString())}`,
    logoBase64: logo,
  });

  const rows = (joueurs.length ? joueurs : [{}]).map((row, i) => [
    safePdfCell(row["#"] ?? row.num ?? String(i + 1)),
    safePdfCell(row.Nom ?? row.nom),
    safePdfCell(row["Prénom"] ?? row.Prenom ?? row.prenom),
    safePdfCell(row.Sexe ?? row.sexe),
    safePdfCell(row["Catégorie"] ?? row.Categorie ?? row.categorie),
    safePdfCell(row["Né le"] ?? row.naissance),
    safePdfCell(row["Âge"] ?? row.Age ?? row.age ?? ageFromBirthdate(String(row.naissance ?? ""))),
    safePdfCell(row.Classement ?? row.classement ?? "—"),
    safePdfCell(row.Club ?? row.club),
    formatStatutPdf(String(row.Statut ?? row.statut ?? "actif")),
  ]);

  engine.kpiRow([
    { label: "Joueurs", value: String(rows.length), color: "#2B6CB0" },
    { label: "Export", value: formatDateFR(new Date().toISOString()), color: "#718096" },
  ]);

  engine.sectionTitle("Liste des joueurs");
  engine.table({
    headers: ["#", "Nom", "Prénom", "Sexe", "Cat.", "Né le", "Âge", "Cl.", "Club", "Statut"],
    colWidths: [10, 36, 36, 12, 22, 24, 12, 22, 58, 24],
    statusColIndex: 9,
    rows,
  });

  engine.save(buildPdfFilename("JOUEURS", "liste", new Date().toISOString().slice(0, 10)));
}
