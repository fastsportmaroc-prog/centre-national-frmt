"use server";

import { syncStageLinkedViewsAction } from "@/lib/actions/stage-planning-actions";
import { revalidatePath } from "next/cache";

/** Aligne le planning sur les réservations terrain après création / modification / suppression. */
export async function syncPlanningAfterReservationChangeAction(
  stageId: string | null | undefined
): Promise<void> {
  revalidatePath("/v2/planning");
  if (!stageId) return;
  await syncStageLinkedViewsAction(stageId, { revalidate: true });
}
