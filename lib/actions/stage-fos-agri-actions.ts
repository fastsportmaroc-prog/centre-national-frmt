"use server";

import {
  deleteStageFosAgriDocument,
  listStageFosAgriDocuments,
  upsertStageFosAgriDocument,
} from "@/lib/supabase/stage-fos-agri.server";
import type { StageFosAgriDocumentV2 } from "@/lib/types/v2";
import { revalidatePath } from "next/cache";

function revalidateStagePaths(stageId: string) {
  revalidatePath("/v2/stages");
  revalidatePath("/v2/dashboard");
  revalidatePath(`/v2/stages/${encodeURIComponent(stageId)}`);
}

export async function getStageFosAgriDocumentsAction(
  stageId: string
): Promise<StageFosAgriDocumentV2[]> {
  return listStageFosAgriDocuments(stageId);
}

export async function uploadStageFosAgriDocumentAction(
  stageId: string,
  slot: 1 | 2,
  formData: FormData
): Promise<{ ok: boolean; document?: StageFosAgriDocumentV2; error?: string }> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Aucun fichier sélectionné." };
  }

  const { document, error } = await upsertStageFosAgriDocument(stageId, slot, file);
  if (error || !document) {
    return { ok: false, error: error ?? "Échec de l’envoi." };
  }

  revalidateStagePaths(stageId);
  return { ok: true, document };
}

export async function deleteStageFosAgriDocumentAction(
  stageId: string,
  slot: 1 | 2
): Promise<{ ok: boolean; error?: string }> {
  const result = await deleteStageFosAgriDocument(stageId, slot);
  if (!result.ok) {
    return { ok: false, error: result.error };
  }
  revalidateStagePaths(stageId);
  return { ok: true };
}
