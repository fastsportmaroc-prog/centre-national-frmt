"use server";

import {
  resyncAllStageTerrainsFromNotes,
  syncReservationsFromPlanning,
} from "@/lib/data/terrains";
import { loadReservationsPageServer } from "@/lib/supabase/reservations-read.server";
import { getSupabaseServerDataClient } from "@/lib/supabase/data-client.server";
import type { ReservationEnrichedV2 } from "@/lib/types/v2";
import { revalidatePath } from "next/cache";

export async function loadReservationsPageAction(options?: {
  dateDebut?: string;
  dateFin?: string;
  /** Synchronise planning → infra avant lecture (défaut: true). */
  syncBeforeLoad?: boolean;
}): Promise<{
  reservations: ReservationEnrichedV2[];
  sync?: { planningUpserted: number; planningSkipped: number };
}> {
  let sync: { planningUpserted: number; planningSkipped: number } | undefined;

  if (options?.syncBeforeLoad !== false) {
    const supabase = await getSupabaseServerDataClient();
    const { upserted, skipped } = await syncReservationsFromPlanning(supabase);
    sync = { planningUpserted: upserted, planningSkipped: skipped };
  }

  const reservations = await loadReservationsPageServer({
    dateDebut: options?.dateDebut,
    dateFin: options?.dateFin,
  });

  return { reservations, sync };
}

export async function fullReconcileReservationsAction(): Promise<{
  planningUpserted: number;
  synced: number;
  processed: number;
  cleaned: number;
}> {
  const supabase = await getSupabaseServerDataClient();
  const { synced, processed, planningUpserted } = await resyncAllStageTerrainsFromNotes(supabase);
  const { cleanupDuplicateMatinWhenJourneeExists } = await import("@/lib/data/terrains");
  const cleaned = await cleanupDuplicateMatinWhenJourneeExists();

  revalidatePath("/v2/reservations");
  revalidatePath("/v2/infrastructures");
  revalidatePath("/v2/stages");
  revalidatePath("/v2/planning");

  return { planningUpserted, synced, processed, cleaned };
}
