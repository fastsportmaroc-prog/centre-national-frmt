export type CompetitionStatut = "a_venir" | "en_cours" | "terminee" | "annulee";

export type CompetitionParticipantType =
  | "joueur"
  | "coach"
  | "kine"
  | "federal"
  | "autre";

export type CompetitionBilletType = "aller" | "retour";

export type CompetitionBilletStatut = "en_attente" | "reserve" | "confirme";

export type CompetitionDocumentType =
  | "convocation"
  | "resultat"
  | "rapport"
  | "lettre_officielle"
  | "autre";

export type CompetitionBudgetCategorie =
  | "billets_avion"
  | "hebergement"
  | "restauration"
  | "textiles"
  | "frais_inscription"
  | "divers";

export type Competition = {
  id: string;
  nom: string;
  categorie: string;
  date_debut: string;
  date_fin: string;
  lieu: string | null;
  statut: CompetitionStatut;
  /** Si true : suivi visa obligatoire pour les participants (hors exemptés). */
  visas_requis: boolean;
  notes: string | null;
  /** individuel = montant par billet ; groupe = facture globale équipe */
  billet_tarif_mode?: "individuel" | "groupe";
  montant_billet_groupe?: number | null;
  created_at: string;
  updated_at: string;
};

export type CompetitionInput = Omit<Competition, "id" | "created_at" | "updated_at">;

export type CompetitionParticipant = {
  id: string;
  competition_id: string;
  participant_id: string;
  participant_type: CompetitionParticipantType;
  /** Nom affiché pour kiné / membre fédéral / autre (participant_id = UUID interne). */
  libelle?: string | null;
  created_at: string;
};

export type CompetitionTextile = {
  id: string;
  competition_id: string;
  participant_id: string;
  article_id: string;
  taille: string | null;
  quantite: number;
  created_at: string;
};

/** Stock textile alloué à une compétition (pool initial décrémenté par les attributions). */
export type CompetitionMaterielStock = {
  id: string;
  competition_id: string;
  article_id: string;
  quantite_initiale: number;
  created_at: string;
  updated_at: string;
};

export type CompetitionMaterielStockEnriched = CompetitionMaterielStock & {
  article_nom: string;
  quantite_attribuee: number;
  quantite_restante: number;
  stock_global_disponible: number;
};

export type CompetitionMaterielStockInput = {
  article_id: string;
  quantite_initiale: number;
};

export type CompetitionBudgetLine = {
  id: string;
  competition_id: string;
  categorie: CompetitionBudgetCategorie;
  montant_prevu: number;
  montant_reel: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type CompetitionBillet = {
  id: string;
  competition_id: string;
  participant_id: string;
  type: CompetitionBilletType;
  date_vol: string;
  heure: string | null;
  numero_vol: string | null;
  compagnie: string | null;
  aeroport_depart?: string | null;
  aeroport_retour?: string | null;
  aeroport_depart_iata?: string | null;
  aeroport_retour_iata?: string | null;
  statut: CompetitionBilletStatut;
  montant?: number | null;
  devise?: string;
  created_at: string;
};

export type CompetitionBilletLegInput = {
  date_vol: string;
  heure?: string | null;
  numero_vol?: string | null;
  compagnie?: string | null;
  aeroport_depart?: string | null;
  aeroport_retour?: string | null;
  aeroport_depart_iata?: string | null;
  aeroport_retour_iata?: string | null;
  statut: CompetitionBilletStatut;
  montant?: number | null;
  devise?: string | null;
};

export type CompetitionBilletHubRow = CompetitionBillet & {
  competition_nom: string;
  participant_nom: string;
  participant_type: CompetitionParticipantType;
};

export type CompetitionBilletFacture = {
  id?: string;
  competition_id: string;
  prestataire_nom: string | null;
  montant: number;
  facture_url: string | null;
  reference: string | null;
  notes: string | null;
};

export type CompetitionDocument = {
  id: string;
  competition_id: string;
  nom: string;
  type: CompetitionDocumentType;
  url: string;
  uploaded_by: string | null;
  created_at: string;
};

export type CompetitionHistoriqueEntry = {
  id: string;
  competition_id: string;
  utilisateur_id: string | null;
  action: string;
  details: string | null;
  created_at: string;
};

export type CompetitionParticipantEnriched = CompetitionParticipant & {
  nom: string;
  prenom: string;
  poste: string;
  fonction: string | null;
  /** Renseigné pour les joueurs (lecture table joueurs). */
  sexe?: "M" | "F" | null;
  passeport_expiration: string | null;
  passeport_alerte: "valide" | "attention" | "expire" | "inconnu";
  visa_statut: "non_requis" | "en_cours" | "obtenu" | "refuse" | "inconnu";
};

export type CompetitionListItem = Competition & {
  nb_participants: number;
  statut_affichage: CompetitionStatut;
};
