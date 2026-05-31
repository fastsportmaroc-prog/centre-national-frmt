/** Stage / programme — aligné sur Calendrier CNE V3 FINALE.xlsx */

export type StatutStage = "prevu" | "confirme" | "en_cours" | "termine" | "annule";

export type StageMaterielAssignation = {
  materiel_id: string;
  quantite: number;
};

export type StageProgramme = {
  id: string;
  id_excel: string | null;
  source: string;
  categorie: string;
  stage_action: string;
  date_debut: string;
  date_fin: string;
  nombre_joueurs: number;
  nombre_encadrants: number;
  hebergement: boolean;
  chambres: number;
  lieu: string | null;
  notes: string | null;
  budget_prevu: number | null;
  budget_reel: number | null;
  statut: StatutStage;
  infrastructure_ids: string[];
  entraineur_ids: string[];
  materiel_assignations: StageMaterielAssignation[];
  created_at: string;
  updated_at: string;
};

export type StageProgrammeInput = Omit<
  StageProgramme,
  "id" | "created_at" | "updated_at"
>;

export type StageProgrammeRowExcel = {
  id_excel?: string;
  source?: string;
  categorie?: string;
  stage_action?: string;
  date_debut?: string;
  date_fin?: string;
  nombre_joueurs?: number;
  nombre_encadrants?: number;
  hebergement?: boolean;
  chambres?: number;
  lieu?: string;
  notes?: string;
};
