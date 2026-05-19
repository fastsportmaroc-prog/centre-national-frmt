import { logHistorique } from "@/lib/audit/historique";
import { getSupabaseDataClient } from "@/lib/supabase/data-client";
import { hasInfrastructureOverlap } from "@/lib/utils/stage-automation";
import type {
  ReservationInfrastructure,
  ReservationInfrastructureInput,
  ReservationInfrastructureWithRelations,
} from "@/lib/types/reservation-infra";
import { getInfrastructures } from "./infrastructures";
import { getStagesProgramme } from "./stages";
import { getJoueurs } from "./joueurs";

async function validateInfraSlot(
  input: ReservationInfrastructureInput,
  excludeId?: string
): Promise<void> {
  const debut = new Date(input.date_debut);
  const fin = new Date(input.date_fin);
  if (fin <= debut) throw new Error("La date de fin doit être après la date de début.");
  const existing = await getReservationsInfrastructure();
  if (
    input.statut !== "annulee" &&
    hasInfrastructureOverlap(existing, input.infrastructure_id, debut, fin, excludeId)
  ) {
    throw new Error(
      "Cette infrastructure est déjà réservée sur ce créneau. Choisissez un autre horaire."
    );
  }
}

export async function getReservationsInfrastructure(): Promise<ReservationInfrastructure[]> {
  const supabase = await getSupabaseDataClient();
  const { data, error } = await supabase
    .from("reservations_infrastructure")
    .select("*")
    .order("date_debut", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as ReservationInfrastructure[];
}

export async function getReservationsInfrastructureWithRelations(): Promise<
  ReservationInfrastructureWithRelations[]
> {
  const [reservations, infrastructures, stages, joueurs] = await Promise.all([
    getReservationsInfrastructure(),
    getInfrastructures(),
    getStagesProgramme(),
    getJoueurs(),
  ]);
  return reservations.map((r) => ({
    ...r,
    infrastructure_nom: infrastructures.find((i) => i.id === r.infrastructure_id)?.nom,
    stage_libelle: stages.find((s) => s.id === r.stage_id)?.stage_action,
    joueur_nom: (() => {
      const j = joueurs.find((x) => x.id === r.joueur_id);
      return j ? `${j.prenom} ${j.nom}` : undefined;
    })(),
  }));
}

export async function createReservationInfrastructure(
  input: ReservationInfrastructureInput
): Promise<ReservationInfrastructure> {
  await validateInfraSlot(input);
  const supabase = await getSupabaseDataClient();
  const { data, error } = await supabase
    .from("reservations_infrastructure")
    .insert({ ...input, updated_at: new Date().toISOString() })
    .select()
    .single();
  if (error) throw new Error(error.message);
  const item = data as ReservationInfrastructure;
  await logHistorique({
    action: "creation",
    module: "reservations",
    entite_id: item.id,
    entite_label: item.infrastructure_id,
    ancienne_valeur: null,
    nouvelle_valeur: item.date_debut,
    commentaire: "Réservation infrastructure",
  });
  return item;
}

export async function cancelReservationInfrastructure(id: string): Promise<void> {
  const supabase = await getSupabaseDataClient();
  const { data: before } = await supabase
    .from("reservations_infrastructure")
    .select("infrastructure_id")
    .eq("id", id)
    .single();

  const { error } = await supabase
    .from("reservations_infrastructure")
    .update({ statut: "annulee", updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);

  await logHistorique({
    action: "annulation",
    module: "reservations",
    entite_id: id,
    entite_label: before?.infrastructure_id ?? null,
    ancienne_valeur: "confirmee",
    nouvelle_valeur: "annulee",
    commentaire: null,
  });
}
