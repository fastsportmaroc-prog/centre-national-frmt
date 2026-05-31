import { getSupabaseDataClient } from "@/lib/supabase/data-client";

import { guardReadAccess, guardWriteAccess } from "@/lib/supabase/data-access-guard";

import { shouldUseLocalTestStorage } from "@/lib/local-test/mode";

import { newLocalId, readJson, writeJson } from "@/lib/local-test/storage";

import type {

  PlanningInput,

  PlanningRecord,

  StageHebergementInput,

  StageHebergementRecord,

  StageRestaurationInput,

  StageRestaurationRecord,

} from "@/lib/types/stage-services";



const KEY_HEBERG = "hebergements_stage";

const KEY_RESTAU = "restaurations_stage";

const KEY_PLANNING = "planning";



function localHebergements(): StageHebergementRecord[] {

  return readJson<StageHebergementRecord[]>(KEY_HEBERG, []);

}



function localRestaurations(): StageRestaurationRecord[] {

  return readJson<StageRestaurationRecord[]>(KEY_RESTAU, []);

}



function localPlanning(): PlanningRecord[] {

  return readJson<PlanningRecord[]>(KEY_PLANNING, []);

}



export async function getStageHebergements(stageId?: string): Promise<StageHebergementRecord[]> {

  if (shouldUseLocalTestStorage()) {

    const all = localHebergements();

    return stageId ? all.filter((h) => h.stage_id === stageId) : all;

  }

  await guardReadAccess();

  const supabase = await getSupabaseDataClient();

  let q = supabase.from("hebergements_stage").select("*");

  if (stageId) q = q.eq("stage_id", stageId);

  const { data, error } = await q;

  if (error) throw new Error(error.message);

  return (data ?? []) as StageHebergementRecord[];

}



export async function createStageHebergement(

  input: StageHebergementInput

): Promise<StageHebergementRecord> {

  if (shouldUseLocalTestStorage()) {

    const item: StageHebergementRecord = {

      ...input,

      id: newLocalId(),

      created_at: new Date().toISOString(),

    };

    writeJson(KEY_HEBERG, [...localHebergements(), item]);

    return item;

  }

  await guardWriteAccess();

  const supabase = await getSupabaseDataClient();

  const { data, error } = await supabase.from("hebergements_stage").insert(input).select().single();

  if (error) throw new Error(error.message);

  return data as StageHebergementRecord;

}



export async function deleteStageHebergement(id: string): Promise<void> {

  if (shouldUseLocalTestStorage()) {

    writeJson(KEY_HEBERG, localHebergements().filter((h) => h.id !== id));

    return;

  }

  await guardWriteAccess();

  const supabase = await getSupabaseDataClient();

  const { error } = await supabase.from("hebergements_stage").delete().eq("id", id);

  if (error) throw new Error(error.message);

}



export async function getStageRestaurations(stageId?: string): Promise<StageRestaurationRecord[]> {

  if (shouldUseLocalTestStorage()) {

    const all = localRestaurations();

    return stageId ? all.filter((r) => r.stage_id === stageId) : all;

  }

  await guardReadAccess();

  const supabase = await getSupabaseDataClient();

  let q = supabase.from("restaurations").select("*");

  if (stageId) q = q.eq("stage_id", stageId);

  const { data, error } = await q;

  if (error) throw new Error(error.message);

  return (data ?? []) as StageRestaurationRecord[];

}



export async function createStageRestauration(

  input: StageRestaurationInput

): Promise<StageRestaurationRecord> {

  if (shouldUseLocalTestStorage()) {

    const item: StageRestaurationRecord = {

      ...input,

      id: newLocalId(),

      created_at: new Date().toISOString(),

    };

    writeJson(KEY_RESTAU, [...localRestaurations(), item]);

    return item;

  }

  await guardWriteAccess();

  const supabase = await getSupabaseDataClient();

  const { data, error } = await supabase.from("restaurations").insert(input).select().single();

  if (error) throw new Error(error.message);

  return data as StageRestaurationRecord;

}



export async function deleteStageRestauration(id: string): Promise<void> {

  if (shouldUseLocalTestStorage()) {

    writeJson(KEY_RESTAU, localRestaurations().filter((r) => r.id !== id));

    return;

  }

  await guardWriteAccess();

  const supabase = await getSupabaseDataClient();

  const { error } = await supabase.from("restaurations").delete().eq("id", id);

  if (error) throw new Error(error.message);

}



export async function getPlanningEntries(stageId?: string): Promise<PlanningRecord[]> {

  if (shouldUseLocalTestStorage()) {

    const all = localPlanning();

    return stageId ? all.filter((p) => p.stage_id === stageId) : all;

  }

  await guardReadAccess();

  const supabase = await getSupabaseDataClient();

  let q = supabase.from("planning").select("*").order("date", { ascending: true });

  if (stageId) q = q.eq("stage_id", stageId);

  const { data, error } = await q;

  if (error) throw new Error(error.message);

  return (data ?? []) as PlanningRecord[];

}



export async function createPlanningEntry(input: PlanningInput): Promise<PlanningRecord> {

  if (shouldUseLocalTestStorage()) {

    const item: PlanningRecord = {

      ...input,

      id: newLocalId(),

      created_at: new Date().toISOString(),

    };

    writeJson(KEY_PLANNING, [...localPlanning(), item]);

    return item;

  }

  await guardWriteAccess();

  const supabase = await getSupabaseDataClient();

  const { data, error } = await supabase.from("planning").insert(input).select().single();

  if (error) throw new Error(error.message);

  return data as PlanningRecord;

}



export async function deletePlanningEntry(id: string): Promise<void> {

  if (shouldUseLocalTestStorage()) {

    writeJson(KEY_PLANNING, localPlanning().filter((p) => p.id !== id));

    return;

  }

  await guardWriteAccess();

  const supabase = await getSupabaseDataClient();

  const { error } = await supabase.from("planning").delete().eq("id", id);

  if (error) throw new Error(error.message);

}



export async function deleteStageServices(stageId: string): Promise<void> {

  if (shouldUseLocalTestStorage()) {

    writeJson(KEY_HEBERG, localHebergements().filter((h) => h.stage_id !== stageId));

    writeJson(KEY_RESTAU, localRestaurations().filter((r) => r.stage_id !== stageId));

    writeJson(KEY_PLANNING, localPlanning().filter((p) => p.stage_id !== stageId));

    return;

  }

  await guardWriteAccess();

  const supabase = await getSupabaseDataClient();

  await supabase.from("hebergements_stage").delete().eq("stage_id", stageId);

  await supabase.from("restaurations").delete().eq("stage_id", stageId);

  await supabase.from("planning").delete().eq("stage_id", stageId);

}


