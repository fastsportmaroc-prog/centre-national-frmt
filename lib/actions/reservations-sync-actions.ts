"use server";

import {
  cleanupDuplicateMatinWhenJourneeExists,
  ensureStageTerrainReservations,
  formatTerrainReservationConflict,
  resyncAllStageTerrainsFromNotes,
  syncReservationsFromPlanning,
} from "@/lib/data/terrains";
import { getSupabaseServerDataClient } from "@/lib/supabase/data-client.server";
import { updateStageServer } from "@/lib/supabase/stage-write.server";
import { revalidatePath } from "next/cache";

function revalidateStageReservationPaths(stageId?: string) {
  revalidatePath("/v2/reservations");
  revalidatePath("/v2/stages");
  revalidatePath("/v2/planning");
  if (stageId) {
    revalidatePath(`/v2/stages/${encodeURIComponent(stageId)}`);
  }
}

/**
 * Nettoie les doublons matin/aprem quand une journée existe déjà.
 */
export async function reconcileStageTerrainReservationsAction(): Promise<{
  cleaned: number;
  synced: number;
  processed: number;
}> {
  const { synced, processed } = await resyncAllStageTerrainsFromNotes();
  const cleaned = await cleanupDuplicateMatinWhenJourneeExists();
  revalidateStageReservationPaths();
  return { cleaned, synced, processed };
}

/**
 * Réécrit les réservations terrain d'un stage depuis `[TERRAINS_BESOINS:…]` dans les notes.
 * Source canonique : table `reservations_infrastructure` (rubrique Réservations V2).
 */
export async function syncStageTerrainReservationsForStageAction(stageId: string): Promise<{
  ok: boolean;
  synced: number;
  conflits: string[];
  cleaned: number;
  error?: string;
}> {
  const supabase = await getSupabaseServerDataClient();
  const { data: stage, error } = await supabase
    .from("stages_programme")
    .select("id, stage_action, date_debut, date_fin, notes, terrains")
    .eq("id", stageId)
    .single();

  if (error || !stage) {
    return { ok: false, synced: 0, conflits: [], cleaned: 0, error: "Stage introuvable" };
  }

  await syncReservationsFromPlanning(supabase, { stageId });

  const { ok, conflits, notesRewritten } = await ensureStageTerrainReservations(
    {
      id: stage.id,
      stage_action: stage.stage_action,
      date_debut: stage.date_debut,
      date_fin: stage.date_fin,
      notes: stage.notes,
      terrains: stage.terrains,
    },
    { supabase }
  );

  const stagePatch: { terrains: boolean; notes?: string } = { terrains: true };
  if (notesRewritten && notesRewritten !== (stage.notes ?? "").trim()) {
    stagePatch.notes = notesRewritten;
  }
  await updateStageServer(stageId, stagePatch);
  const cleaned = await cleanupDuplicateMatinWhenJourneeExists();
  revalidateStageReservationPaths(stageId);

  return {
    ok: true,
    synced: ok.length,
    conflits: conflits.map(formatTerrainReservationConflict),
    cleaned,
    error: conflits.length > 0 ? `${conflits.length} conflit(s) terrain` : undefined,
  };
}
