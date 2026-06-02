"use server";

import { syncReservationsFromPlanning } from "@/lib/data/terrains";
import { getSupabaseServerDataClient } from "@/lib/supabase/data-client.server";
import { loadReservationsPlannerBundle } from "@/lib/supabase/reservations-planner.server";

export async function loadReservationsPlannerAction(options?: {
  dateDebut?: string;
  dateFin?: string;
  syncBeforeLoad?: boolean;
}) {
  if (options?.syncBeforeLoad !== false) {
    const supabase = await getSupabaseServerDataClient();
    await syncReservationsFromPlanning(supabase);
  }

  return loadReservationsPlannerBundle({
    dateDebut: options?.dateDebut,
    dateFin: options?.dateFin,
  });
}
