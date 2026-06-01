import type { BudgetDeplacementWithLignes } from "@/lib/types/budget-deplacement";
import type { ReportMeta } from "@/lib/export/reports";
import {
  CATEGORIE_LIGNE_BUDGET_LABELS,
  CATEGORIES_BUDGET_COACH,
} from "@/lib/constants/budget-deplacement";
import { formatPeriodePrint } from "@/lib/print/format-date";
function daysBetween(start: string, end: string): number {
  const a = new Date(start.slice(0, 10));
  const b = new Date(end.slice(0, 10));
  const diff = Math.max(1, Math.round((b.getTime() - a.getTime()) / 86400000) + 1);
  return diff;
}

/** Lignes réellement renseignées (montant > 0 ou description non vide) */
function lignesRenseignees(budget: BudgetDeplacementWithLignes) {
  return budget.lignes.filter(
    (l) => l.montant_total > 0 || (l.description?.trim().length ?? 0) > 0
  );
}

export function buildBudgetDeplacementReport(
  budget: BudgetDeplacementWithLignes,
  joueurNom: string,
  coachNom?: string | null
): ReportMeta {
  const filled = lignesRenseignees(budget);
  const joueurLines = filled.filter((l) => !CATEGORIES_BUDGET_COACH.includes(l.categorie));
  const coachLines = filled.filter((l) => CATEGORIES_BUDGET_COACH.includes(l.categorie));

  const sum = (lines: typeof filled) =>
    lines.reduce((s, l) => s + l.montant_total, 0);

  const totalJoueur = sum(joueurLines);
  const totalCoach = sum(coachLines);
  const totalGeneral = totalJoueur + totalCoach;
  const jours = daysBetween(budget.date_depart, budget.date_retour);
  const coutParJour = totalGeneral / jours;

  const rows: string[][] = [];

  if (joueurLines.length > 0) {
    rows.push(["— Dépenses joueur —", "", "", "", "", ""]);
    for (const l of joueurLines) {
      rows.push([
        CATEGORIE_LIGNE_BUDGET_LABELS[l.categorie],
        l.description?.trim() || "—",
        String(l.quantite),
        l.prix_unitaire.toLocaleString("fr-FR"),
        `${l.montant_total.toLocaleString("fr-FR")} ${l.devise}`,
        l.type === "reel" ? "Réel" : "Prévisionnel",
      ]);
    }
  }

  if (coachLines.length > 0) {
    rows.push(["— Dépenses coach / équipe —", "", "", "", "", ""]);
    for (const l of coachLines) {
      rows.push([
        CATEGORIE_LIGNE_BUDGET_LABELS[l.categorie],
        l.description?.trim() || "—",
        String(l.quantite),
        l.prix_unitaire.toLocaleString("fr-FR"),
        `${l.montant_total.toLocaleString("fr-FR")} ${l.devise}`,
        l.type === "reel" ? "Réel" : "Prévisionnel",
      ]);
    }
  }

  rows.push(["", "", "", "", "", ""]);
  rows.push([
    "Total joueur",
    "",
    "",
    "",
    `${totalJoueur.toLocaleString("fr-FR")} ${budget.devise}`,
    "",
  ]);
  if (budget.avec_coach || totalCoach > 0) {
    rows.push([
      "Total coach",
      coachNom ?? "",
      "",
      "",
      `${totalCoach.toLocaleString("fr-FR")} ${budget.devise}`,
      "",
    ]);
  }
  rows.push([
    "Total général",
    "",
    "",
    "",
    `${totalGeneral.toLocaleString("fr-FR")} ${budget.devise}`,
    "",
  ]);
  rows.push([
    "Coût par jour",
    `${jours} jour(s)`,
    "",
    "",
    `${coutParJour.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} ${budget.devise}`,
    "",
  ]);
  rows.push([
    "Imputation compte joueur",
    "",
    "",
    "",
    budget.statut === "paye" || budget.statut === "cloture" ? "Effectuée" : "En attente",
    "",
  ]);

  return {
    titre: "Budget déplacement joueur",
    sousTitre: `${joueurNom} — ${budget.tournoi} · ${budget.destination}`,
    filtres: `${formatPeriodePrint(budget.date_depart, budget.date_retour)} · ${budget.devise}${budget.valide_par ? ` · Validé par ${budget.valide_par}` : ""}`,
    periodeLabel: formatPeriodePrint(budget.date_depart, budget.date_retour),
    mainTableTitle: "Lignes de dépenses",
    kpis: [
      { label: "Total", value: `${totalGeneral.toLocaleString("fr-FR")}`, sub: budget.devise },
      { label: "Joueur", value: `${totalJoueur.toLocaleString("fr-FR")}`, sub: budget.devise },
      { label: "Coach", value: `${totalCoach.toLocaleString("fr-FR")}`, sub: budget.devise },
      {
        label: "Coût / jour",
        value: `${coutParJour.toLocaleString("fr-FR", { maximumFractionDigits: 0 })}`,
        sub: `${jours} jour(s)`,
      },
    ],
    colonnes: ["Catégorie", "Description", "Qté", "Prix unit.", "Montant", "Type"],
    headerAlign: ["left", "left", "center", "center", "center", "center"],
    cellAlign: ["left", "left", "center", "center", "center", "center"],
    lignes: rows,
  };
}
