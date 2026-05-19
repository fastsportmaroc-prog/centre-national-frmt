export type TypeEvenementRestauration =
  | "tournoi"
  | "stage"
  | "repas_equipe"
  | "evenement_officiel"
  | "autre";

export type StatutBesoinRestauration =
  | "brouillon"
  | "planifie"
  | "commande"
  | "livre"
  | "facture"
  | "paye"
  | "annule";

export type StatutFactureRestauration =
  | "brouillon"
  | "emise"
  | "en_attente_paiement"
  | "payee"
  | "litige"
  | "annulee";

export type PrestataireRestauration = {
  id: string;
  nom: string;
  contact_nom: string | null;
  email: string | null;
  telephone: string | null;
  adresse: string | null;
  notes: string | null;
  actif: boolean;
  created_at: string;
};

export type PrestataireRestaurationInput = Omit<PrestataireRestauration, "id" | "created_at">;

export type BesoinRestauration = {
  id: string;
  titre: string;
  type_evenement: TypeEvenementRestauration;
  date_evenement: string;
  date_besoin: string;
  type_repas: string;
  nombre_personnes: number;
  menu_prevu: string | null;
  allergies: string | null;
  prestataire_id: string | null;
  prestataire_nom: string | null;
  statut: StatutBesoinRestauration;
  montant_estime: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type BesoinRestaurationInput = Omit<
  BesoinRestauration,
  "id" | "created_at" | "updated_at" | "prestataire_nom"
>;

export type FactureRestauration = {
  id: string;
  prestataire_id: string;
  besoin_id: string | null;
  numero_facture: string;
  date_facture: string;
  date_echeance: string | null;
  montant_ht: number;
  montant_ttc: number;
  tva_pct: number;
  devise: string;
  statut: StatutFactureRestauration;
  piece_jointe_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type FactureRestaurationInput = Omit<
  FactureRestauration,
  "id" | "created_at" | "updated_at"
>;

export type PrestataireEtatGeneral = {
  prestataire: PrestataireRestauration;
  besoins_total: number;
  besoins_en_cours: number;
  factures_total: number;
  montant_facture_ttc: number;
  montant_paye: number;
  montant_impaye: number;
  derniere_facture_date: string | null;
};
