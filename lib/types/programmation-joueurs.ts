/** Types — module Programmation Joueurs */

export type ProgrammationType =
  | "tournoi_itf"
  | "tournoi_atp_wta"
  | "coupe_davis"
  | "bjk_cup"
  | "stage_national"
  | "stage_etranger"
  | "competition_nationale"
  | "blessure"
  | "repos"
  | "autre";

export type ProgrammationSurface =
  | "dur"
  | "terre_battue"
  | "gazon"
  | "indoor"
  | "synthetique";

export type ProgrammationStatut = "a_venir" | "en_cours" | "termine";

export type ProgrammationTableau = "simple" | "double" | "les_deux";

export type ProgrammationEvenement = {
  id: string;
  joueur_id: string;
  type: ProgrammationType;
  nom: string;
  pays: string | null;
  ville: string | null;
  date_debut: string;
  date_fin: string;
  surface: ProgrammationSurface | null;
  altitude: number | null;
  categorie_tournoi: string | null;
  dotation_usd: number | null;
  points_gain_vainqueur: number | null;
  tableau: ProgrammationTableau | null;
  wild_card: boolean;
  classement_requis: number | null;
  site_officiel: string | null;
  statut: ProgrammationStatut;
  resultat_simple: string | null;
  resultat_double: string | null;
  points_gagnes: number | null;
  prize_money_usd: number | null;
  notes_coach: string | null;
  billet_avion_id: string | null;
  hebergement_id: string | null;
  visa_requis: boolean;
  per_diem_prevu: number | null;
  competition_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ProgrammationEvenementEnriched = ProgrammationEvenement & {
  joueur_nom?: string;
  joueur_prenom?: string;
  joueur_photo_url?: string | null;
  joueur_categorie?: string | null;
  joueur_classement?: string | null;
};

export type ProgrammationEvenementInput = Omit<
  ProgrammationEvenement,
  "id" | "created_at" | "updated_at" | "created_by"
>;

export type ProgrammationFilters = {
  joueurId?: string;
  joueurIds?: string[];
  type?: ProgrammationType | ProgrammationType[];
  statut?: ProgrammationStatut;
  surface?: ProgrammationSurface;
  dateDebut?: string;
  dateFin?: string;
  search?: string;
  categorieJoueur?: string;
};

export type ProgrammationJoueurStats = {
  joueurId: string;
  annee: number;
  tournois: number;
  stages: number;
  semainesCompetition: number;
  semainesRepos: number;
  paysVisites: string[];
  pointsGagnes: number;
  prizeMoneyUsd: number;
};

export type ProgrammationPdfType = "mensuel" | "annuel" | "plage" | "multi";

export type CreateProgrammationPayload = ProgrammationEvenementInput & {
  /** Crée une ligne par joueur (même événement). */
  joueur_ids?: string[];
};
