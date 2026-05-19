import { getSupabaseDataClient } from "@/lib/supabase/data-client";
import type { Court, CourtInput, CourtWithStats, Reservation } from "@/lib/types/database";
import type { Infrastructure } from "@/lib/types/infrastructures";
import {
  createInfrastructure,
  deleteInfrastructure,
  updateInfrastructure,
} from "@/lib/data/infrastructures";
import {
  courtInputToInfrastructureInput,
  courtPatchToInfrastructurePatch,
  infrastructureToCourt,
} from "@/lib/utils/infrastructure-court";
import { getReservations } from "./reservations";
import { isToday } from "@/lib/utils/dates";

export async function getCourts(): Promise<Court[]> {
  const supabase = await getSupabaseDataClient();
  const { data, error } = await supabase
    .from("infrastructures")
    .select("*")
    .eq("type", "terrain")
    .order("nom");
  if (!error && (data?.length ?? 0) > 0) {
    return (data as Infrastructure[]).map(infrastructureToCourt);
  }
  const legacy = await supabase.from("courts").select("*").order("nom");
  if (legacy.error) throw new Error(legacy.error.message);
  return (legacy.data ?? []) as Court[];
}

export async function getCourtById(id: string): Promise<Court | null> {
  const courts = await getCourts();
  return courts.find((c) => c.id === id) ?? null;
}

export async function createCourt(input: CourtInput): Promise<Court> {
  const infra = await createInfrastructure(courtInputToInfrastructureInput(input));
  return infrastructureToCourt(infra);
}

export async function updateCourt(id: string, input: Partial<CourtInput>): Promise<Court> {
  const patch = courtPatchToInfrastructurePatch(input);
  const infra = await updateInfrastructure(id, patch);
  return infrastructureToCourt(infra);
}

export async function deleteCourt(id: string): Promise<void> {
  const supabase = await getSupabaseDataClient();
  await supabase.from("reservations").delete().eq("court_id", id);
  await deleteInfrastructure(id);
}

function computeOccupation(courtId: string, reservations: Reservation[]): {
  count: number;
  rate: number;
} {
  const today = reservations.filter(
    (r) =>
      r.court_id === courtId &&
      r.statut !== "annulee" &&
      isToday(r.date_debut)
  );
  const slots = 12;
  return {
    count: today.length,
    rate: Math.min(100, Math.round((today.length / slots) * 100)),
  };
}

export async function getCourtsWithStats(): Promise<CourtWithStats[]> {
  const [courts, reservations] = await Promise.all([getCourts(), getReservations()]);
  return courts.map((c) => {
    const { count, rate } = computeOccupation(c.id, reservations);
    return {
      ...c,
      reservations_count: count,
      taux_occupation: rate,
    };
  });
}

export async function getReservationsByCourt(courtId: string): Promise<Reservation[]> {
  const all = await getReservations();
  return all
    .filter((r) => r.court_id === courtId)
    .sort((a, b) => new Date(b.date_debut).getTime() - new Date(a.date_debut).getTime());
}
