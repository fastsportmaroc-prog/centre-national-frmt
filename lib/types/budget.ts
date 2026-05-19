export type CategorieBudget =
  | "stages"
  | "voyages"
  | "hebergement"
  | "restauration"
  | "equipement"
  | "total";

export type BudgetAnnuelLigne = {
  id: string;
  annee: number;
  categorie: CategorieBudget;
  libelle: string;
  montant_alloue: number;
  montant_engage: number;
  montant_reel: number;
  devise: string;
  notes: string | null;
  updated_at: string;
};

export type BudgetAnnuelLigneInput = Omit<BudgetAnnuelLigne, "id" | "updated_at">;

export type BudgetJoueurResume = {
  joueur_id: string;
  joueur_nom: string;
  categorie_age: string;
  budget_alloue: number;
  depenses_reelles: number;
  ecart: number;
  taux_utilisation_pct: number;
};

export type BudgetStageResume = {
  stage_id: string;
  stage_libelle: string;
  categorie: string;
  date_debut: string;
  budget_prevu: number;
  budget_reel: number;
  ecart: number;
};

export type BudgetDashboard = {
  annee: number;
  lignes_annuelles: BudgetAnnuelLigne[];
  total_alloue: number;
  total_reel: number;
  total_engage: number;
  par_joueur: BudgetJoueurResume[];
  par_stage: BudgetStageResume[];
};
