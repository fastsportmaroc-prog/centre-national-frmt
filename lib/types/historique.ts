export type ModuleHistorique =
  | "joueurs"
  | "groupes"
  | "courts"
  | "reservations"
  | "logistique"
  | "billets"
  | "passeport"
  | "performances"
  | "hebergement"
  | "restauration"
  | "stages"
  | "occupation"
  | "entraineurs"
  | "budget"
  | "budget_deplacement"
  | "infrastructures"
  | "materiel"
  | "rapports"
  | "systeme";

export type ActionHistorique =
  | "creation"
  | "modification"
  | "suppression"
  | "validation"
  | "refus"
  | "annulation"
  | "envoi_email"
  | "export"
  | "imputation"
  | "stage_created";

export type HistoriqueEntry = {
  id: string;
  utilisateur_nom: string;
  utilisateur_role: string;
  action: ActionHistorique;
  module: ModuleHistorique;
  entite_id: string | null;
  entite_label: string | null;
  ancienne_valeur: string | null;
  nouvelle_valeur: string | null;
  commentaire: string | null;
  created_at: string;
};

export type HistoriqueInput = Omit<HistoriqueEntry, "id" | "created_at">;

export type HistoriqueFilters = {
  utilisateur?: string;
  module?: ModuleHistorique | "";
  action?: ActionHistorique | "";
  dateDebut?: string;
  dateFin?: string;
};
