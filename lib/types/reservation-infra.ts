import type { ReservationStatut } from "@/lib/types/database";

export type ReservationInfrastructure = {
  id: string;
  infrastructure_id: string;
  date_debut: string;
  date_fin: string;
  statut: ReservationStatut;
  joueur_id: string | null;
  groupe_id: string | null;
  stage_id: string | null;
  entraineur_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type ReservationInfrastructureInput = Omit<
  ReservationInfrastructure,
  "id" | "created_at" | "updated_at"
>;

export type ReservationInfrastructureWithRelations = ReservationInfrastructure & {
  infrastructure_nom?: string;
  joueur_nom?: string;
  stage_libelle?: string;
};
