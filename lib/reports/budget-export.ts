import type { ReportMeta } from "@/lib/export/reports";
import type { BudgetDashboard } from "@/lib/types/budget";
import { CATEGORIES_BUDGET } from "@/lib/constants/budget";

export function buildBudgetAnnuelReport(dashboard: BudgetDashboard): ReportMeta {
  return {
    titre: `Budget annuel ${dashboard.annee} — Centre National FRMT`,
    colonnes: ["Catégorie", "Libellé", "Alloué", "Engagé", "Réel", "Écart"],
    lignes: dashboard.lignes_annuelles
      .filter((l) => l.categorie !== "total")
      .map((l) => {
        const label =
          CATEGORIES_BUDGET.find((c) => c.value === l.categorie)?.label ?? l.categorie;
        return [
          label,
          l.libelle,
          `${l.montant_alloue.toLocaleString("fr-FR")} MAD`,
          `${l.montant_engage.toLocaleString("fr-FR")} MAD`,
          `${l.montant_reel.toLocaleString("fr-FR")} MAD`,
          `${(l.montant_alloue - l.montant_reel).toLocaleString("fr-FR")} MAD`,
        ];
      }),
  };
}

export function buildBudgetJoueursReport(dashboard: BudgetDashboard): ReportMeta {
  return {
    titre: `Budget par joueur — ${dashboard.annee}`,
    colonnes: ["Joueur", "Catégorie", "Alloué", "Dépenses", "Écart", "Utilisation %"],
    lignes: dashboard.par_joueur.map((j) => [
      j.joueur_nom,
      j.categorie_age,
      `${j.budget_alloue.toLocaleString("fr-FR")} MAD`,
      `${j.depenses_reelles.toLocaleString("fr-FR")} MAD`,
      `${j.ecart.toLocaleString("fr-FR")} MAD`,
      `${j.taux_utilisation_pct}%`,
    ]),
  };
}

export function budgetToCsv(dashboard: BudgetDashboard): string {
  const lines = [
    "Section;Libellé;Montant",
    ...dashboard.lignes_annuelles.map(
      (l) => `Annuel;${l.libelle};${l.montant_reel}`
    ),
    ...dashboard.par_joueur.map(
      (j) => `Joueur;${j.joueur_nom};${j.depenses_reelles}`
    ),
    ...dashboard.par_stage.map(
      (s) => `Stage;${s.stage_libelle};${s.budget_reel}`
    ),
  ];
  return lines.join("\n");
}
