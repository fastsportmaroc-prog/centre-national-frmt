export type StatutEntraineur = "actif" | "inactif" | "en_mission";

export type TypeMissionEntraineur = "stage" | "tournoi" | "mission" | "formation";

export type StatutMissionEntraineur = "planifie" | "en_cours" | "termine" | "annule";

export type Entraineur = {
  id: string;
  prenom: string;
  nom: string;
  email: string | null;
  telephone: string | null;
  specialite: string | null;
  licence_fft: string | null;
  statut: StatutEntraineur;
  groupe_ids: string[];
  budget_voyages_annuel: number | null;
  photo_url: string | null;
  notes: string | null;
  created_at: string;
};

export type EntraineurInput = Omit<Entraineur, "id" | "created_at">;

export type MissionEntraineur = {
  id: string;
  entraineur_id: string;
  stage_id: string | null;
  titre: string;
  lieu: string | null;
  date_debut: string;
  date_fin: string;
  type_mission: TypeMissionEntraineur;
  statut: StatutMissionEntraineur;
  notes: string | null;
  created_at: string;
};

export type MissionEntraineurInput = Omit<MissionEntraineur, "id" | "created_at">;

export type EntraineurDepense = {
  id: string;
  entraineur_id: string;
  date_depense: string;
  categorie: "billet_avion" | "hebergement" | "transport" | "restauration" | "autre";
  libelle: string;
  montant: number;
  devise: string;
  mission_id: string | null;
  created_at: string;
};

export type EntraineurDepenseInput = Omit<EntraineurDepense, "id" | "created_at">;

export type DisponibiliteEntraineur = {
  id: string;
  entraineur_id: string;
  date: string;
  disponible: boolean;
  motif: string | null;
};

export type DisponibiliteEntraineurInput = Omit<DisponibiliteEntraineur, "id">;

export type EntraineurWithDetails = Entraineur & {
  missions_count?: number;
  depenses_total?: number;
};
