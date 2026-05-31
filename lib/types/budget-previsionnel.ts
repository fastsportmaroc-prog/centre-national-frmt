/** Budget prévisionnel mission / joueur / équipe — FRMT */

export type TypeBudgetPrevisionnel =
  | "joueur"
  | "equipe"
  | "stage"
  | "tournoi"
  | "mission";

export type StatutBudgetPrevisionnel =
  | "brouillon"
  | "valide"
  | "envoye"
  | "paye"
  | "archive";

export type BudgetPrevisionnelLine = {
  id: string;
  designation: string;
  description: string | null;
  quantite: number;
  jours_nuits: number;
  prix_unitaire_eur: number;
  total_eur: number;
  remarques: string | null;
  ordre: number;
};

export type BudgetPrevisionnelSignatory = {
  id: string;
  poste: string;
  nom: string;
  ordre: number;
};

export type BudgetMembreExtraType = "kine" | "federal" | "autre";

/** Membre saisi manuellement (kiné, fédéral, autre) */
export type BudgetMembreExtra = {
  id: string;
  type: BudgetMembreExtraType;
  /** Optionnel — sans nom, seul le type (fonction) est affiché. */
  nom?: string;
  prenom?: string;
};

/** Effectifs saisis en mode groupe / équipe */
export type BudgetGroupeEffectif = {
  joueurs: number;
  coachs: number;
  kine: number;
  federal: number;
  autre: number;
};

/** Plusieurs joueurs / coachs / membres staff sur un même budget */
export type BudgetParticipantsMeta = {
  joueur_ids: string[];
  coach_ids: string[];
  membres_extras?: BudgetMembreExtra[];
  /** Mode groupe — effectifs par catégorie */
  groupe_effectif?: BudgetGroupeEffectif;
};

export type BudgetPrevisionnelHistoryEntry = {
  id: string;
  budget_id: string;
  action: string;
  utilisateur: string;
  details: string | null;
  created_at: string;
};

export type BudgetPrevisionnel = {
  id: string;
  objet: string;
  type_budget: TypeBudgetPrevisionnel;
  sujet_libelle: string;
  avec_coach: boolean;
  coach_nom: string | null;
  tournoi_evenement: string | null;
  pays: string | null;
  ville: string | null;
  date_debut: string;
  date_fin: string;
  nombre_personnes: number;
  devise: string;
  taux_mad: number;
  statut: StatutBudgetPrevisionnel;
  joueur_id: string | null;
  entraineur_id: string | null;
  stage_id: string | null;
  equipe_libelle: string | null;
  sous_total_eur: number;
  total_eur: number;
  total_mad: number;
  montant_lettres_mad: string | null;
  dernier_export_pdf_at: string | null;
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
  lignes: BudgetPrevisionnelLine[];
  signataires: BudgetPrevisionnelSignatory[];
  /** Liste complète des participants (JSONB Supabase ou local) */
  participants?: BudgetParticipantsMeta;
};

export type BudgetPrevisionnelInput = Omit<
  BudgetPrevisionnel,
  | "id"
  | "sous_total_eur"
  | "total_eur"
  | "total_mad"
  | "montant_lettres_mad"
  | "dernier_export_pdf_at"
  | "created_at"
  | "updated_at"
  | "created_by"
  | "updated_by"
  | "lignes"
  | "signataires"
> & {
  lignes: Omit<BudgetPrevisionnelLine, "id" | "total_eur">[];
  /** Toujours dérivé de SIGNATAIRES_DEFAUT côté serveur / data layer si absent. */
  signataires?: Omit<BudgetPrevisionnelSignatory, "id">[];
  participants?: BudgetParticipantsMeta;
};

export type BudgetPrevisionnelFilters = {
  q?: string;
  type_budget?: TypeBudgetPrevisionnel | "";
  joueur_id?: string;
  entraineur_id?: string;
  stage_id?: string;
  statut?: StatutBudgetPrevisionnel | "";
  date_debut?: string;
  date_fin?: string;
};
