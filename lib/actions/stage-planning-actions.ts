"use server";

import { ensureStageTerrainReservations } from "@/lib/data/terrains";
import { syncAllStagesPlanning, syncStagePlanning } from "@/lib/v2/sync-stage-planning";
import { getStageDetailV2Action } from "@/lib/actions/stage-detail-actions";
import { getEntraineursByStage } from "@/lib/supabase/queries";
import { revalidateStageLinkedPaths } from "@/lib/server/revalidate-stage-paths";

async function runStagePlanningSync(stageId: string): Promise<number> {
  const stage = await getStageDetailV2Action(stageId);
  if (!stage) return 0;

  const coachs = await getEntraineursByStage(stageId);
  const coach_id = coachs[0]?.id ?? null;

  const created = await syncStagePlanning({
    stage_id: stage.id,
    date_debut: stage.date_debut,
    date_fin: stage.date_fin,
    notes: stage.notes,
    categorie: stage.categorie,
    coach_id,
  });

  if (stage.terrains || stage.notes?.includes("[TERRAINS_BESOINS:")) {
    await ensureStageTerrainReservations({
      id: stage.id,
      stage_action: stage.stage_action,
      date_debut: stage.date_debut,
      date_fin: stage.date_fin,
      notes: stage.notes,
      terrains: stage.terrains,
    }).catch((err) => console.warn("[syncStagePlanning] terrains:", err));
  }

  return created;
}

export async function syncStagePlanningAction(stageId: string): Promise<{ created: number }> {
  const created = await runStagePlanningSync(stageId);
  revalidateStageLinkedPaths(stageId);
  return { created };
}

/** Sync planning ; invalidation optionnelle (évite un refresh Next sur la fiche ouverte). */
export async function syncStageLinkedViewsAction(
  stageId: string,
  options?: { revalidate?: boolean }
): Promise<{ created: number }> {
  const created = await runStagePlanningSync(stageId);
  if (options?.revalidate !== false) {
    revalidateStageLinkedPaths(stageId);
  }
  return { created };
}

export async function syncAllStagesPlanningAction(): Promise<{ stages: number; created: number }> {
  const result = await syncAllStagesPlanning();
  revalidateStageLinkedPaths();
  return result;
}
