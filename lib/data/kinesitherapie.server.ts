import "server-only";

import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getSupabaseServerDataClient } from "@/lib/supabase/data-client.server";
import type { KinesitherapieStageV2 } from "@/lib/types/v2";

export async function upsertKinesitherapieStageServer(
  payload: Omit<KinesitherapieStageV2, "id" | "created_at"> & { id?: string }
): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase non configuré" };
  }
  const supabase = await getSupabaseServerDataClient();
  const { error } = await supabase
    .from("kinesitherapie_stages")
    .upsert(payload, { onConflict: "stage_id" });
  if (error) {
    if (/relation|schema cache|does not exist/i.test(error.message)) {
      return {
        ok: false,
        error:
          "Tables kinésithérapie absentes. Exécutez lib/db/migrations/kinesitherapie.sql dans Supabase.",
      };
    }
    if (error.message.includes("row-level security")) {
      return {
        ok: false,
        error:
          "Accès kinésithérapie refusé (RLS). Exécutez supabase/migrations/046_kinesitherapie_rls.sql.",
      };
    }
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export async function replaceKinesitherapieStageParticipantsServer(
  stage_id: string,
  rows: { personne_id: string; personne_type: "joueur" | "entraineur"; auto_from_seance: boolean }[]
): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase non configuré" };
  }
  const supabase = await getSupabaseServerDataClient();
  const { error: delErr } = await supabase
    .from("kinesitherapie_stage_participants")
    .delete()
    .eq("stage_id", stage_id);
  if (delErr) return { ok: false, error: delErr.message };
  if (rows.length === 0) return { ok: true };
  const { error } = await supabase.from("kinesitherapie_stage_participants").insert(
    rows.map((r) => ({ stage_id, ...r }))
  );
  return error ? { ok: false, error: error.message } : { ok: true };
}
