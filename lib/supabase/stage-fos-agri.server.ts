import "server-only";

import { getSupabaseServerDataClient } from "@/lib/supabase/data-client.server";
import type { StageFosAgriDocumentV2 } from "@/lib/types/v2";

const TABLE = "stage_fos_agri_documents";
const BUCKET = "stage-fos-agri";
const MAX_BYTES = 10 * 1024 * 1024;

function now() {
  return new Date().toISOString();
}

export async function listStageFosAgriDocuments(
  stageId: string
): Promise<StageFosAgriDocumentV2[]> {
  const supabase = await getSupabaseServerDataClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("stage_id", stageId)
    .order("slot", { ascending: true });
  if (error) {
    console.warn("[listStageFosAgriDocuments]", error.message);
    return [];
  }
  return (data ?? []) as StageFosAgriDocumentV2[];
}

export async function upsertStageFosAgriDocument(
  stageId: string,
  slot: 1 | 2,
  file: File
): Promise<{ document: StageFosAgriDocumentV2 | null; error?: string }> {
  if (file.type !== "application/pdf") {
    return { document: null, error: "Seuls les fichiers PDF sont acceptés." };
  }
  if (file.size > MAX_BYTES) {
    return { document: null, error: "Fichier trop volumineux (max 10 Mo)." };
  }

  const supabase = await getSupabaseServerDataClient();
  const safeName = file.name.replace(/[^\w.\-() ]+/g, "_").slice(0, 120) || "document.pdf";
  const storagePath = `${stageId}/slot-${slot}-${Date.now()}.pdf`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { data: existing } = await supabase
    .from(TABLE)
    .select("id, storage_path")
    .eq("stage_id", stageId)
    .eq("slot", slot)
    .maybeSingle();

  if (existing?.storage_path) {
    await supabase.storage.from(BUCKET).remove([existing.storage_path as string]);
  }

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(storagePath, buffer, {
    upsert: true,
    cacheControl: "3600",
    contentType: "application/pdf",
  });
  if (uploadError) {
    return {
      document: null,
      error:
        uploadError.message +
        (uploadError.message.includes("bucket")
          ? " — exécutez la migration 051 (bucket stage-fos-agri)."
          : ""),
    };
  }

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
  const fileUrl = urlData.publicUrl;

  const row = {
    stage_id: stageId,
    slot,
    file_name: safeName,
    storage_path: storagePath,
    file_url: fileUrl,
    updated_at: now(),
  };

  const { data, error } = await supabase
    .from(TABLE)
    .upsert(row, { onConflict: "stage_id,slot" })
    .select("*")
    .single();

  if (error) return { document: null, error: error.message };
  return { document: data as StageFosAgriDocumentV2 };
}

export async function deleteStageFosAgriDocument(
  stageId: string,
  slot: 1 | 2
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await getSupabaseServerDataClient();
  const { data: existing } = await supabase
    .from(TABLE)
    .select("id, storage_path")
    .eq("stage_id", stageId)
    .eq("slot", slot)
    .maybeSingle();

  if (!existing?.id) return { ok: true };

  if (existing.storage_path) {
    await supabase.storage.from(BUCKET).remove([existing.storage_path as string]);
  }

  const { error } = await supabase.from(TABLE).delete().eq("id", existing.id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
