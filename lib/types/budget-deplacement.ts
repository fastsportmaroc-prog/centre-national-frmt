export type StatutBudgetDeplacement = "brouillon" | "valide" | "paye" | "cloture";
export type TypeLigneBudget = "previsionnel" | "reel";
export type CategorieLigneBudget =
  | "billet_avion_joueur"
  | "billet_avion_coach"
  | "hotel_joueur"
  | "hotel_coach"
  | "restauration"
  | "argent_de_poche"
  | "transport_local"
  | "inscription_tournoi"
  | "cordage"
  | "materiel"
  | "visa"
  | "assurance"
  | "kine_medical"
  | "autres_frais";

export type BudgetDeplacement = {
  id: string;
  joueur_id: string;
  coach_id: string | null;
  tournoi: string;
  destination: string;
  date_depart: string;
  date_retour: string;
  avec_coach: boolean;
  devise: string;
  statut: StatutBudgetDeplacement;
  total_previsionnel: number;
  total_reel: number;
  valide_par: string | null;
  date_validation: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type BudgetDeplacementInput = Omit<
  BudgetDeplacement,
  "id" | "total_previsionnel" | "total_reel" | "created_at" | "updated_at"
>;

export type LigneBudgetDeplacement = {
  id: string;
  budget_deplacement_id: string;
  joueur_id: string;
  categorie: CategorieLigneBudget;
  description: string;
  quantite: number;
  prix_unitaire: number;
  montant_total: number;
  devise: string;
  type: TypeLigneBudget;
  impute_joueur: boolean;
  commentaire: string | null;
  created_at: string;
  updated_at: string;
};

export type LigneBudgetDeplacementInput = Omit<
  LigneBudgetDeplacement,
  "id" | "montant_total" | "created_at" | "updated_at"
>;

export type BudgetDeplacementWithLignes = BudgetDeplacement & {
  lignes: LigneBudgetDeplacement[];
};
