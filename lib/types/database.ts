// ——— Catégories & énumérations ———
/** @deprecated Préférer `string` — catégories configurables dans Paramètres V2. */
export type CategorieAge = string;
export type SexeJoueur = "M" | "F" | "Autre";
export type StatutJoueur = "actif" | "blesse" | "absent" | "suspendu";
export type CourtStatut = "disponible" | "occupe" | "maintenance" | "ferme";
export type ReservationStatut =
  | "confirmee"
  | "en_attente"
  | "annulee"
  | "terminee";

// ——— Groupes ———
export type Groupe = {
  id: string;
  nom: string;
  description: string | null;
  couleur: string | null;
  created_at: string;
};

export type GroupeInput = Omit<Groupe, "id" | "created_at">;

// ——— Joueurs ———
export type Joueur = {
  id: string;
  photo_url: string | null;
  prenom: string;
  nom: string;
  date_naissance: string;
  categorie_age: CategorieAge;
  sexe: SexeJoueur;
  nationalite: string | null;
  country_code?: string | null;
  federation?: string | null;
  external_atp_id?: string | null;
  external_wta_id?: string | null;
  external_itf_id?: string | null;
  external_itf_junior_id?: string | null;
  external_tennis_provider_id?: string | null;
  is_marocain?: boolean;
  is_frmt_tracked?: boolean;
  email: string | null;
  telephone: string | null;
  club?: string | null;
  niveau: string | null;
  classement: string | null;
  groupe_id: string | null;
  coach_referent: string | null;
  statut: StatutJoueur;
  documents: string | null;
  notes: string | null;
  created_at: string;
};

export type JoueurInput = Omit<Joueur, "id" | "created_at">;

export type JoueurWithGroupe = Joueur & { groupe?: Groupe | null };

// ——— Courts ———
export type Court = {
  id: string;
  nom: string;
  surface: string;
  couvert: boolean;
  eclairage: boolean;
  actif: boolean;
  statut: CourtStatut;
  maintenance_jusquau: string | null;
  notes: string | null;
  created_at: string;
};

export type CourtInput = Omit<Court, "id" | "created_at">;

export type CourtWithStats = Court & {
  reservations_count: number;
  taux_occupation: number;
};

// ——— Réservations ———
export type Reservation = {
  id: string;
  joueur_id: string;
  court_id: string;
  date_debut: string;
  date_fin: string;
  statut: ReservationStatut;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type ReservationInput = Omit<Reservation, "id" | "created_at" | "updated_at">;

export type ReservationWithRelations = Reservation & {
  joueur?: Joueur;
  court?: Court;
};

// ——— Hébergement ———
export type TypeChambreHebergement = "single" | "double" | "triple";

export type Hebergement = {
  id: string;
  pavillon: number;
  numero_chambre: number;
  nom_chambre: string;
  /** Libellé affiché (Simple / Double / Triple) */
  type_chambre: string;
  /** Type technique pour formulaires */
  type_chambre_code: TypeChambreHebergement;
  capacite: number;
  occupe: boolean;
  created_at: string;
};

export type HebergementInput = Omit<Hebergement, "id" | "created_at" | "nom_chambre"> & {
  nom_chambre?: string;
};

export type Repas = {
  id: string;
  date_repas: string;
  type_repas: string;
  menu: string | null;
  allergies: string | null;
  nombre_personnes: number;
  created_at: string;
};

export type DashboardStats = {
  totalJoueurs: number;
  courtsActifs: number;
  reservationsAujourdhui: number;
  tauxOccupation: number;
};

export type JoueurFilters = {
  search?: string;
  sexe?: SexeJoueur | "";
  categorie?: CategorieAge | "";
  groupeId?: string;
  niveau?: string;
  statut?: StatutJoueur | "";
  ageMin?: number;
  ageMax?: number;
};
