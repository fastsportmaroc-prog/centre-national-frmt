export type TypeDemandeLogistique =
  | "billet_avion"
  | "hotel"
  | "transport"
  | "restauration"
  | "equipement"
  | "deplacement_competition"
  | "stage"
  | "mission";

export type StatutDemandeLogistique =
  | "brouillon"
  | "en_attente"
  | "validee_direction"
  | "validee_logistique"
  | "refusee"
  | "envoyee"
  | "traitee";

export type DemandeLogistique = {
  id: string;
  type: TypeDemandeLogistique;
  demandeur_nom: string;
  demandeur_role: string;
  joueur_concerne_id: string | null;
  titre: string;
  description: string | null;
  date_besoin: string | null;
  statut: StatutDemandeLogistique;
  validateur_direction: string | null;
  validateur_logistique: string | null;
  date_validation_direction: string | null;
  date_validation_logistique: string | null;
  motif_refus: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type DemandeLogistiqueInput = Omit<
  DemandeLogistique,
  "id" | "created_at" | "updated_at"
>;

export type TypePersonneBillet = "joueur" | "coach" | "staff";
export type ContexteDeplacement = "tournoi" | "stage" | "mission";

export type DemandeBilletAvion = {
  id: string;
  demandeur_nom: string;
  demandeur_role: string;
  type_personne: TypePersonneBillet;
  joueur_concerne_id: string | null;
  joueur_concerne_nom: string | null;
  ville_depart: string;
  ville_arrivee: string;
  aeroport_depart_code: string | null;
  aeroport_arrivee_code: string | null;
  aller_retour: boolean;
  duree_sejour_jours: number | null;
  date_aller: string;
  date_retour: string | null;
  preference_horaire: string | null;
  bagage: string | null;
  passeport: string | null;
  motif_deplacement: string;
  contexte: ContexteDeplacement;
  urgence: boolean;
  statut: StatutDemandeLogistique;
  validateur: string | null;
  date_validation: string | null;
  agence_voyage: string;
  notes: string | null;
  piece_jointe_url: string | null;
  /** Prix saisi à l'accord (validation direction) */
  prix_billet: number | null;
  prix_devise: string | null;
  /** Choix retour figé à l'accord */
  aller_retour_accorde: boolean | null;
  date_retour_accorde: string | null;
  depense_joueur_id: string | null;
  depense_enregistree: boolean;
  created_at: string;
  updated_at: string;
};

export type DemandeBilletAvionInput = Omit<
  DemandeBilletAvion,
  "id" | "created_at" | "updated_at"
>;
