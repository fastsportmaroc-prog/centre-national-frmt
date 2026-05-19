/** Occupation CNE — aligné sur Gestion Occupation CNE.xlsx */

export type OccupationCneSnapshot = {
  id: string;
  date: string;
  pavillon: number;
  numero_chambre: number;
  type_chambre: string;
  capacite: number;
  occupants: number;
  stage_id: string | null;
  stage_id_excel: string | null;
  stage_libelle: string | null;
  categorie: string | null;
  taux_occupation_pct: number;
  alerte: string | null;
  created_at: string;
};

export type OccupationCneInput = Omit<OccupationCneSnapshot, "id" | "created_at">;

export type OccupationCneRowExcel = {
  date?: string;
  pavillon?: number;
  numero_chambre?: number;
  type_chambre?: string;
  capacite?: number;
  occupants?: number;
  stage_id_excel?: string;
  stage_libelle?: string;
  categorie?: string;
  taux_occupation_pct?: number;
  alerte?: string;
};

export type OccupationCentreResume = {
  date: string;
  taux_chambres_pct: number;
  chambres_occupees: number;
  chambres_total: number;
  alertes_surcharge: number;
  terrains_occupes: number;
  terrains_total: number;
};
