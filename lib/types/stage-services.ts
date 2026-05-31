/** Hébergement lié à un stage (table hebergements_stage). */

export type StageHebergementRecord = {

  id: string;

  stage_id: string;

  date_debut: string;

  date_fin: string;

  type_chambre_joueurs: string | null;

  type_chambre_coachs: string | null;

  nb_chambres_joueurs: number;

  nb_chambres_coachs: number;

  kitchenette: boolean;

  remarques: string | null;

  statut: string;

  created_at: string;

};



export type StageHebergementInput = Omit<StageHebergementRecord, "id" | "created_at">;



/** Restauration liée à un stage (table restaurations). */

export type StageRestaurationRecord = {

  id: string;

  stage_id: string;

  petit_dejeuner: boolean;

  dejeuner: boolean;

  diner: boolean;

  date_debut: string;

  date_fin: string;

  nb_personnes: number;

  total_repas: number;

  remarques: string | null;

  statut: string;

  created_at: string;

};



export type StageRestaurationInput = Omit<StageRestaurationRecord, "id" | "created_at">;



/** Créneau planning stage (table planning). */

export type PlanningRecord = {

  id: string;

  stage_id: string;

  date: string;

  heure_debut: string;

  heure_fin: string;

  infrastructure_id: string;

  surface: string | null;

  coach_id: string | null;

  groupe: string | null;

  statut: string;

  created_at: string;

};



export type PlanningInput = Omit<PlanningRecord, "id" | "created_at">;



export type StageJoueurLink = {

  stage_id: string;

  joueur_id: string;

};



export type StageCoachLink = {

  stage_id: string;

  coach_id: string;

};


