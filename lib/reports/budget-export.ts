import type { ReportMeta } from "@/lib/export/reports";
import type { BudgetDashboard } from "@/lib/types/budget";
import { CATEGORIES_BUDGET } from "@/lib/constants/budget";
import { DEFAULT_OBSERVATIONS } from "@/lib/print/report-enrich";

function mad(n: number) {
  return `${n.toLocaleString("fr-FR")} MAD`;
}

export function buildBudgetAnnuelReport(dashboard: BudgetDashboard): ReportMeta {
  const lignes = dashboard.lignes_annuelles.filter((l) => l.categorie !== "total");
  const totalAlloue = lignes.reduce((s, l) => s + l.montant_alloue, 0);
  const totalReel = lignes.reduce((s, l) => s + l.montant_reel, 0);
  const totalEngage = lignes.reduce((s, l) => s + l.montant_engage, 0);
  const ecart = totalAlloue - totalReel;

  const tableLignes = lignes.map((l) => {
    const label = CATEGORIES_BUDGET.find((c) => c.value === l.categorie)?.label ?? l.categorie;
    return [
      label,
      l.libelle,
      mad(l.montant_alloue),
      mad(l.montant_engage),
      mad(l.montant_reel),
      mad(l.montant_alloue - l.montant_reel),
    ];
  });

  const byCat = new Map<string, number>();
  for (const l of lignes) {
    const label = CATEGORIES_BUDGET.find((c) => c.value === l.categorie)?.label ?? l.categorie;
    byCat.set(label, (byCat.get(label) ?? 0) + l.montant_reel);
  }
  const recapRows = [...byCat.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([cat, montant]) => [
      cat,
      mad(montant),
      totalReel > 0 ? `${Math.round((montant / totalReel) * 100)}%` : "0%",
    ]);

  return {
    titre: `Budget annuel ${dashboard.annee}`,
    sousTitre: "FRMT",
    periodeLabel: `Exercice ${dashboard.annee}`,
    mainTableTitle: "Lignes budgétaires",
    metaRows: [
      [
        { label: "Exercice", value: String(dashboard.annee) },
        { label: "Lignes", value: String(lignes.length) },
      ],
      [
        { label: "Devise", value: "MAD" },
        { label: "Écart global", value: mad(ecart) },
      ],
    ],
    kpis: [
      { label: "Alloué", value: mad(totalAlloue), sub: "budget prévu" },
      { label: "Engagé", value: mad(totalEngage), sub: "commandes" },
      { label: "Réel", value: mad(totalReel), sub: "consommé" },
      { label: "Écart", value: mad(ecart), sub: "alloué − réel" },
    ],
    colonnes: ["Catégorie", "Libellé", "Alloué", "Engagé", "Réel", "Écart"],
    headerAlign: ["left", "left", "center", "center", "center", "center"],
    cellAlign: ["left", "left", "center", "center", "center", "center"],
    lignes: tableLignes,
    footer: [
      ["TOTAUX", "", mad(totalAlloue), mad(totalEngage), mad(totalReel), mad(ecart)],
    ],
    recap: recapRows.length
      ? {
          title: "Répartition des dépenses réelles",
          colonnes: ["CATÉGORIE", "MONTANT RÉEL", "% DU TOTAL"],
          lignes: recapRows,
          footer: [["TOTAL", mad(totalReel), totalReel > 0 ? "100%" : "0%"]],
          headerAlign: ["left", "center", "center"],
          cellAlign: ["left", "center", "center"],
        }
      : undefined,
    observations: DEFAULT_OBSERVATIONS,
    legacyPrintStyle: true,
  };
}

export function buildBudgetJoueursReport(dashboard: BudgetDashboard): ReportMeta {
  const rows = dashboard.par_joueur;
  const totalAlloue = rows.reduce((s, j) => s + j.budget_alloue, 0);
  const totalDepenses = rows.reduce((s, j) => s + j.depenses_reelles, 0);
  const moyenne =
    rows.length > 0 ? Math.round(rows.reduce((s, j) => s + j.taux_utilisation_pct, 0) / rows.length) : 0;

  return {
    titre: `Budget par joueur — ${dashboard.annee}`,
    sousTitre: `${rows.length} joueur(s)`,
    periodeLabel: `Exercice ${dashboard.annee}`,
    mainTableTitle: "Détail par joueur",
    kpis: [
      { label: "Joueurs", value: String(rows.length), sub: "fiches" },
      { label: "Alloué", value: mad(totalAlloue), sub: "total" },
      { label: "Dépenses", value: mad(totalDepenses), sub: "réelles" },
      { label: "Utilisation", value: `${moyenne}%`, sub: "moyenne" },
    ],
    colonnes: ["Joueur", "Catégorie", "Alloué", "Dépenses", "Écart", "Utilisation %"],
    headerAlign: ["left", "center", "center", "center", "center", "center"],
    cellAlign: ["left", "center", "center", "center", "center", "center"],
    lignes: rows.map((j) => [
      j.joueur_nom,
      j.categorie_age,
      mad(j.budget_alloue),
      mad(j.depenses_reelles),
      mad(j.ecart),
      `${j.taux_utilisation_pct}%`,
    ]),
    footer: [
      [
        "TOTAUX",
        "",
        mad(totalAlloue),
        mad(totalDepenses),
        mad(totalAlloue - totalDepenses),
        `${moyenne}%`,
      ],
    ],
    observations: DEFAULT_OBSERVATIONS,
    legacyPrintStyle: true,
  };
}

export function budgetToCsv(dashboard: BudgetDashboard): string {
  const lines = [
    "Section;Libellé;Montant",
    ...dashboard.lignes_annuelles.map((l) => `Annuel;${l.libelle};${l.montant_reel}`),
    ...dashboard.par_joueur.map((j) => `Joueur;${j.joueur_nom};${j.depenses_reelles}`),
    ...dashboard.par_stage.map((s) => `Stage;${s.stage_libelle};${s.budget_reel}`),
  ];
  return lines.join("\n");
}
