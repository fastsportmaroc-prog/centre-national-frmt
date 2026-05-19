export type TypeInfrastructure =
  | "terrain"
  | "emplacement_physique"
  | "fitness"
  | "natation"
  | "autre";

export type SurfaceInfrastructure =
  | "terre_battue"
  | "dur"
  | "indoor"
  | "exterieur"
  | "autre";

export type StatutInfrastructure = "disponible" | "occupe" | "maintenance" | "ferme";

export type Infrastructure = {
  id: string;
  nom: string;
  type: TypeInfrastructure;
  surface: SurfaceInfrastructure;
  capacite: number;
  actif: boolean;
  statut: StatutInfrastructure;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type InfrastructureInput = Omit<Infrastructure, "id" | "created_at" | "updated_at">;

export type InfrastructureUsage = {
  infrastructure_id: string;
  date_debut: string;
  date_fin: string;
  module: string;
  reference_id: string | null;
  commentaire: string | null;
};
