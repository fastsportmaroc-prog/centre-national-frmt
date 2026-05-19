import { getSupabaseDataClient } from "@/lib/supabase/data-client";
import type {
  Reservation,
  ReservationInput,
  ReservationWithRelations,
} from "@/lib/types/database";
import { hasReservationOverlap } from "@/lib/utils/reservations";
import { getCourts } from "./courts";
import { getJoueurs } from "./joueurs";

export async function getReservations(): Promise<Reservation[]> {
  const supabase = await getSupabaseDataClient();
  const { data, error } = await supabase
    .from("reservations")
    .select("*")
    .order("date_debut", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Reservation[];
}

export async function getReservationsWithRelations(): Promise<
  ReservationWithRelations[]
> {
  const [reservations, joueurs, courts] = await Promise.all([
    getReservations(),
    getJoueurs(),
    getCourts(),
  ]);
  return reservations.map((r) => ({
    ...r,
    joueur: joueurs.find((j) => j.id === r.joueur_id),
    court: courts.find((c) => c.id === r.court_id),
  }));
}

async function validateSlot(
  input: ReservationInput,
  excludeId?: string
): Promise<void> {
  const debut = new Date(input.date_debut);
  const fin = new Date(input.date_fin);
  if (fin <= debut) {
    throw new Error("La date de fin doit être après la date de début.");
  }
  const existing = await getReservations();
  if (
    input.statut !== "annulee" &&
    hasReservationOverlap(existing, input.court_id, debut, fin, excludeId)
  ) {
    throw new Error(
      "Ce court est déjà réservé sur ce créneau. Choisissez un autre horaire ou court."
    );
  }
}

export async function createReservation(
  input: ReservationInput
): Promise<Reservation> {
  await validateSlot(input);

  const supabase = await getSupabaseDataClient();
  const { data, error } = await supabase
    .from("reservations")
    .insert({ ...input, updated_at: new Date().toISOString() })
    .select()
    .single();
  if (error) {
    if (error.code === "23P01") {
      throw new Error("Ce court est déjà réservé sur ce créneau horaire.");
    }
    throw new Error(error.message);
  }
  return data as Reservation;
}

export async function updateReservation(
  id: string,
  input: Partial<ReservationInput>
): Promise<Reservation> {
  const supabase = await getSupabaseDataClient();
  const { data: currentData, error: fetchError } = await supabase
    .from("reservations")
    .select("*")
    .eq("id", id)
    .single();
  if (fetchError) throw new Error(fetchError.message);
  const current = currentData as Reservation;

  const merged: ReservationInput = {
    joueur_id: input.joueur_id ?? current.joueur_id,
    court_id: input.court_id ?? current.court_id,
    date_debut: input.date_debut ?? current.date_debut,
    date_fin: input.date_fin ?? current.date_fin,
    statut: input.statut ?? current.statut,
    notes: input.notes !== undefined ? input.notes : current.notes,
  };

  await validateSlot(merged, id);

  const { data, error } = await supabase
    .from("reservations")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) {
    if (error.code === "23P01") {
      throw new Error("Ce court est déjà réservé sur ce créneau horaire.");
    }
    throw new Error(error.message);
  }
  return data as Reservation;
}

export async function cancelReservation(id: string): Promise<Reservation> {
  return updateReservation(id, { statut: "annulee" });
}

export async function deleteReservation(id: string): Promise<void> {
  const supabase = await getSupabaseDataClient();
  const { error } = await supabase.from("reservations").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
