/** Types V2 — Centre National FRMT */

export type StatutStageV2 = "prevu" | "confirme" | "termine" | "annule";

export type StageProgrammeV2 = {
  id: string;
  source?: string;
  categorie: string;
  stage_action: string;
  date_debut: string;
  date_fin: string;
  nombre_joueurs: number;
  nombre_encadrants: number;
  hebergement: boolean;
  chambres?: number;
  lieu: string | null;
  notes: string | null;
  statut: StatutStageV2 | string;
  terrains?: boolean;
  restauration?: boolean;
  kinesitherapie?: boolean;
  transport_avion?: boolean;
  created_at?: string;
  updated_at?: string;
};

export type StageProgrammeInputV2 = Omit<StageProgrammeV2, "id" | "created_at" | "updated_at">;

export type StageFosAgriDocumentV2 = {
  id: string;
  stage_id: string;
  slot: 1 | 2;
  file_name: string;
  storage_path: string;
  file_url: string;
  created_at?: string;
  updated_at?: string;
};

/** Dates d'hébergement par participant (arrivée tardive / départ anticipé). */
export type HebergementParticipantsDatesStore = {
  actif: boolean;
  rows: HebergementParticipantDates[];
};

export type HebergementParticipantDates = {
  personne_id: string;
  personne_type: "joueur" | "entraineur";
  date_debut: string;
  date_fin: string;
  /** Coché si dates différentes du bloc hébergement stage. */
  dates_personnalisees: boolean;
  kitchenette?: boolean;
  note?: string;
};

export type StageLogistiqueParticipantType = "joueur" | "coach";

export type HebergementParticipantRow = {
  id?: string;
  stage_id: string;
  participant_id: string;
  participant_type: StageLogistiqueParticipantType;
  heberge: boolean;
  date_arrivee: string;
  date_depart: string;
  chambre_id?: string | null;
  statut: "confirmé" | "en attente" | "annulé";
  nom?: string;
  prenom?: string;
  meta?: string;
  chambre_nom?: string;
};

export type JourRepasStage = {
  date: string;
  petit_dejeuner: boolean;
  dejeuner: boolean;
  diner: boolean;
};

export type ParticipantMealOverride = {
  id?: string;
  participant_id: string;
  participant_type: StageLogistiqueParticipantType;
  date: string;
  petit_dejeuner: boolean | null;
  dejeuner: boolean | null;
  diner: boolean | null;
  nom?: string;
  prenom?: string;
};

export type HebergementStageV2 = {
  id: string;
  stage_id: string;
  date_debut: string;
  date_fin: string;
  type_chambre_joueurs?: string | null;
  type_chambre_coachs?: string | null;
  nb_chambres_joueurs?: number;
  nb_chambres_coachs?: number;
  chambres?: number;
  kitchenette?: boolean;
  remarques?: string | null;
  participants_dates?: HebergementParticipantDates[] | HebergementParticipantsDatesStore | null;
  statut: string;
  created_at?: string;
};

export type RestaurationStageV2 = {
  id: string;
  stage_id: string;
  petit_dejeuner: boolean;
  dejeuner: boolean;
  diner: boolean;
  date_debut: string;
  date_fin: string;
  nb_personnes: number;
  total_repas: number;
  remarques?: string | null;
  statut: string;
  created_at?: string;
};

export type KinesitherapieSeanceV2 = {
  id: string;
  joueur_id: string;
  date_seance: string;
  duree_minutes?: number | null;
  motif?: string | null;
  notes?: string | null;
  created_at?: string;
};

export type KinesitherapieStageV2 = {
  id: string;
  stage_id: string;
  actif: boolean;
  date_debut: string | null;
  date_fin: string | null;
  remarques?: string | null;
  statut: string;
  created_at?: string;
};

export type KinesitherapieStageParticipantV2 = {
  id: string;
  stage_id: string;
  personne_id: string;
  personne_type: "joueur" | "entraineur";
  auto_from_seance: boolean;
  created_at?: string;
};

export type InterneChambreV2 = {
  id: string;
  numero: string;
  batiment: "A" | "B" | "C" | string;
  type?: "simple" | "double" | "triple" | string;
  genre?: "M" | "F" | "mixte" | "staff" | string | null;
  capacite?: number;
  statut?: "libre" | "occupee" | "maintenance" | "reservee" | string;
  notes?: string | null;
  created_at?: string;
};

export type OccupationChambreV2 = {
  id: string;
  chambre_id: string;
  occupant_id?: string | null;
  occupant_type?: "joueur" | "coach" | string | null;
  occupant_nom: string;
  stage_id?: string | null;
  date_arrivee?: string | null;
  date_depart?: string | null;
  statut?: string;
  notes?: string | null;
  created_at?: string;
};

export type PresenceRepasV2 = {
  id: string;
  stage_id: string;
  personne_id?: string | null;
  personne_type?: "joueur" | "coach" | string | null;
  personne_nom: string;
  date_repas: string;
  petit_dejeuner: boolean;
  dejeuner: boolean;
  diner: boolean;
  created_at?: string;
};

export type FactureClubV2 = {
  id: string;
  stage_id?: string | null;
  montant_hebergement: number;
  montant_restauration: number;
  montant_terrains: number;
  montant_total: number;
  statut: "brouillon" | "en_attente" | "paye" | "annule" | string;
  date_emission?: string | null;
  date_paiement?: string | null;
  reference_paiement?: string | null;
  notes?: string | null;
  created_at?: string;
};

export type FacturePrestataireV2 = {
  id: string;
  stage_id?: string | null;
  competition_id?: string | null;
  service_type: "hebergement" | "restauration" | "billets_avion" | string;
  prestataire_nom?: string | null;
  montant?: number | null;
  facture_url?: string | null;
  reference?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type RapportLogistiqueV2 = {
  id: string;
  type: "stage" | "hebdo" | "mensuel" | string;
  periode_debut?: string | null;
  periode_fin?: string | null;
  stage_id?: string | null;
  contenu?: Record<string, unknown> | null;
  observations?: string | null;
  recommandations?: string | null;
  statut?: "brouillon" | "valide" | string;
  envoye_dtn?: boolean;
  envoye_at?: string | null;
  created_at?: string;
};

export type PlanningSeanceV2 = {
  id: string;
  stage_id: string;
  date: string;
  heure_debut: string;
  heure_fin: string;
  infrastructure_id?: string | null;
  surface?: string | null;
  coach_id?: string | null;
  groupe?: string | null;
  statut: string;
  created_at?: string;
};

export type CreneauReservationV2 = "matin" | "apres_midi" | "journee";

export type ReservationInfraV2 = {
  id: string;
  infrastructure_id: string;
  stage_id?: string | null;
  entraineur_id?: string | null;
  date_debut: string;
  date_fin: string;
  creneau?: CreneauReservationV2 | string | null;
  heure_debut?: string | null;
  heure_fin?: string | null;
  statut: string;
  notes?: string | null;
  created_at?: string;
};

export type ReservationEnrichedV2 = ReservationInfraV2 & {
  stage_nom?: string | null;
  stage_categorie?: string | null;
  court_nom?: string | null;
  court_surface?: string | null;
  infrastructure_type?: string | null;
  coach_nom?: string | null;
  coach_prenom?: string | null;
  groupe?: string | null;
};

export type DemandeBilletAvionV2 = {
  id: string;
  stage_id: string;
  personne_id?: string | null;
  personne_type: "joueur" | "entraineur";
  personne_nom: string;
  personne_prenom: string;
  aeroport_depart: string;
  date_depart: string;
  heure_depart?: string | null;
  aeroport_retour: string;
  date_retour: string;
  heure_retour?: string | null;
  prix_unitaire: number;
  devise: string;
  statut: "demande" | "confirme" | "annule" | "rembourse";
  notes?: string | null;
  created_at?: string;
};

export type StageJoueurV2 = { stage_id: string; joueur_id: string };
export type StageCoachV2 = { stage_id: string; coach_id: string };

export type JoueurV2 = {
  id: string;
  nom: string;
  prenom: string;
  sexe?: "M" | "F" | string | null;
  photo_url?: string | null;
  categorie_age?: string;
  categorie?: string;
  date_naissance?: string;
  nationalite?: string | null;
  classement?: string | null;
  classement_itf?: string | null;
  licence?: string | null;
  /** Identifiant IPIN (ITF) */
  ipin?: string | null;
  email?: string | null;
  telephone?: string | null;
  club?: string | null;
  contact_parent?: string | null;
  regime_alimentaire?: "standard" | "sans_porc" | "vegetarien" | "sans_gluten" | "autre" | string | null;
  regime_details?: string | null;
  taille_survetement?: string | null;
  taille_tshirt?: string | null;
  taille_short?: string | null;
  taille_jupe?: string | null;
  taille_chaussures?: string | null;
  passeport_numero?: string | null;
  passeport_expiration?: string | null;
  statut?: string;
  created_at?: string;
};

export type EntraineurV2 = {
  id: string;
  nom: string;
  prenom: string;
  email?: string | null;
  telephone?: string | null;
  specialite?: string | null;
  passeport_numero?: string | null;
  passeport_expiration?: string | null;
  statut?: string;
  groupe_ids?: string[];
  budget_voyages_annuel?: number | null;
  photo_url?: string | null;
  notes?: string | null;
  taille_survetement?: string | null;
  taille_tshirt?: string | null;
  taille_short?: string | null;
  taille_jupe?: string | null;
  taille_chaussures?: string | null;
  created_at?: string;
};

export type InfrastructureV2 = {
  id: string;
  nom: string;
  type?: string | null;
  surface?: string | null;
  capacite?: number;
  statut?: string;
};

export type HistoriqueV2 = {
  id: string;
  stage_id?: string | null;
  action: string;
  description?: string | null;
  utilisateur_nom?: string | null;
  utilisateur_role?: string | null;
  user_nom?: string | null;
  user_role?: string | null;
  table_concernee?: string | null;
  record_id?: string | null;
  diff?: Record<string, { avant: unknown; apres: unknown }> | null;
  module?: string | null;
  entite_id?: string | null;
  entite_label?: string | null;
  ancienne_valeur?: unknown;
  nouvelle_valeur?: unknown;
  commentaire?: string | null;
  created_at: string;
};

export type StageHebergementForm = {
  actif: boolean;
  date_debut: string;
  date_fin: string;
  type_chambre_joueurs: "single" | "double" | "triple";
  type_chambre_coachs: "single" | "double";
  /** Nombre de chambres réservées (saisie ou calcul). */
  nb_chambres_joueurs: number;
  nb_chambres_coachs: number;
  kitchenette: boolean;
  remarques: string;
  /** Cocher pour afficher et enregistrer les dates par participant. */
  dates_participants_actif: boolean;
  participants_dates: HebergementParticipantDates[];
};

export type StageRestaurationForm = {
  actif: boolean;
  petit_dejeuner: boolean;
  dejeuner: boolean;
  diner: boolean;
  date_debut: string;
  date_fin: string;
  remarques: string;
};

export type StageTerrainsForm = {
  actif: boolean;
  nb_courts: number;
  surface: "terre_battue" | "dur" | "indifferent";
  creneau: "matin" | "apres_midi" | "journee";
  fitness: boolean;
  natation: boolean;
  espace_physique: boolean;
};

export type StageTransportAvionForm = {
  actif: boolean;
  aeroport_depart: string;
  date_depart: string;
  heure_depart: string;
  aeroport_retour: string;
  date_retour: string;
  heure_retour: string;
  prix_unitaire: number;
  tous_joueurs: boolean;
  tous_entraineurs: boolean;
  joueur_ids: string[];
  entraineur_ids: string[];
};

export type LettreHebergementExceptionForm = {
  personne_id: string;
  personne_type: "joueur" | "entraineur";
  date_debut?: string;
  date_fin?: string;
  kitchenette?: boolean;
  note?: string;
};

export type StageLettreForm = {
  club_destinataire: string;
  lieu_envoi: string;
  type: "reservation" | "terrains_only" | "liste_participants" | "libre";
  exceptions: LettreHebergementExceptionForm[];
  contenu_personnalise?: string;
};

export type StageCompletFormData = {
  stage_action: string;
  categorie: string;
  date_debut: string;
  date_fin: string;
  lieu: string;
  statut: StatutStageV2;
  notes: string;
  joueur_ids: string[];
  entraineur_ids: string[];
  hebergement: StageHebergementForm;
  restauration: StageRestaurationForm;
  terrains: StageTerrainsForm;
  transport_avion: StageTransportAvionForm;
  lettre: StageLettreForm;
};

export type CreateStageCompletResult = {
  success: boolean;
  stage_id?: string;
  hebergement_cree: boolean;
  restauration_creee: boolean;
  seances_creees: number;
  reservations_creees: number;
  billets_generes: number;
  lettre_generee?: boolean;
  lettre_id?: string;
  lettre_pdf_base64?: string;
  lettre_docx_base64?: string;
  lettre_filename_base?: string;
  erreurs: string[];
  message?: string;
};

export type TarifsTransportSettings = {
  prix_billet_eur: number;
  prix_billet_mad: number;
  taux_eur_mad: number;
};

export type TarifsBudgetSettings = {
  prix_petit_dejeuner_mad: number;
  prix_dejeuner_mad: number;
  prix_diner_mad: number;
  prix_chambre_single_mad: number;
  prix_chambre_double_mad: number;
};
