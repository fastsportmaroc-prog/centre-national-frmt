import { revalidatePath } from "next/cache";

/** Pages V2 liées aux stages (planning + calendrier). */
const STAGE_LINKED_PATHS = ["/v2/planning", "/v2/calendrier", "/v2/stages", "/v2/dashboard"] as const;

/** Invalide le cache Next des vues planning, calendrier et stages (pas la fiche détail : données client). */
export function revalidateStageLinkedPaths(_stageId?: string) {
  for (const p of STAGE_LINKED_PATHS) revalidatePath(p);
}

/** @deprecated Utiliser revalidateStageLinkedPaths */
export const revalidatePlanningPaths = revalidateStageLinkedPaths;
