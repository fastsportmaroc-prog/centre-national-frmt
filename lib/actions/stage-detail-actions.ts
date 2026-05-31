"use server";

import { localGetStageById } from "@/lib/local-test/stages-store";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getSupabaseServerDataClient } from "@/lib/supabase/data-client.server";
import type { StageProgrammeV2 } from "@/lib/types/v2";

const STAGES_TABLE = "stages_programme";

export async function getStageDetailV2Action(id: string): Promise<StageProgrammeV2 | null> {
  const stageId = decodeURIComponent(id.trim());
  if (!stageId) return null;

  if (!isSupabaseConfigured()) {
    const local = localGetStageById(stageId);
    return local as unknown as StageProgrammeV2 | null;
  }

  try {
    const supabase = await getSupabaseServerDataClient();
    const { data, error } = await supabase
      .from(STAGES_TABLE)
      .select("*")
      .eq("id", stageId)
      .maybeSingle();
    if (error) {
      console.warn("[getStageDetailV2Action]", error.message);
      return null;
    }
    return (data ?? null) as StageProgrammeV2 | null;
  } catch (e) {
    console.warn("[getStageDetailV2Action]", e instanceof Error ? e.message : e);
    return null;
  }
}
