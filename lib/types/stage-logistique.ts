/** Configuration étendue d'un stage (formulaire + provisionnement local) */

export type TypeChambreStage = "individuelle" | "double" | "triple";
export type TypeChambreStaff = "individuelle" | "double";
export type CreneauTerrain = "journee" | "matin" | "apres_midi" | "personnalise";
export type SurfaceSouhaitee = "terre_battue" | "dur" | "indifferent";

export type StageHebergementConfig = {
  actif: boolean;
  date_debut: string;
  date_fin: string;
  type_chambre_joueurs: TypeChambreStage;
  type_chambre_staff: TypeChambreStaff;
  kitchenette: boolean;
  chambres_kitchenette: number;
  remarques: string | null;
};

export type StageRestaurationConfig = {
  actif: boolean;
  date_debut: string;
  date_fin: string;
  petit_dejeuner: boolean;
  dejeuner: boolean;
  diner: boolean;
  allergies: string | null;
};

export type StageTerrainsConfig = {
  actif: boolean;
  nombre_courts: number;
  surface: SurfaceSouhaitee;
  creneau: CreneauTerrain;
  heure_debut?: string;
  heure_fin?: string;
  infrastructure_ids_manuels: string[];
  affectation_auto: boolean;
};

export type StageHebergementParticipantDatesSnapshot = {
  personne_id: string;
  personne_type: "joueur" | "entraineur";
  date_debut: string;
  date_fin: string;
  dates_personnalisees: boolean;
};

export type StageLogistiquePack = {
  joueur_ids: string[];
  entraineur_ids: string[];
  hebergement: StageHebergementConfig | null;
  /** Dates hébergement par personne (sync onglets lettre / logistique). */
  hebergement_participants_dates?: StageHebergementParticipantDatesSnapshot[];
  restauration: StageRestaurationConfig | null;
  terrains: StageTerrainsConfig | null;
  /** Résultat dernier provisionnement */
  dernier_provisionnement?: StageProvisionnementResult | null;
};

export type StageProvisionnementResult = {
  at: string;
  reservations_crees: number;
  besoins_restauration_crees: number;
  hebergement_cree: number;
  restauration_cree: number;
  planning_crees: number;
  conflits: string[];
  alertes: string[];
  calendrier_entrees: number;
  erreurs?: string[];
};

export type StageCalendarEntry = {
  date: string;
  label: string;
  date_debut: string;
  date_fin: string;
  infrastructure_id: string;
};

export type AccommodationNeeds = {
  nuits: number;
  chambres_joueurs: number;
  chambres_staff: number;
  chambres_kitchenette: number;
  total_chambres: number;
  total_nuitees: number;
};

export type MealNeeds = {
  jours: number;
  personnes: number;
  petits_dejeuners: number;
  dejeuners: number;
  diners: number;
  total_repas: number;
};
