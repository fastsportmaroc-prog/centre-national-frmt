import { getSupabaseDataClient } from "@/lib/supabase/data-client";

import { guardReadAccess, guardWriteAccess } from "@/lib/supabase/data-access-guard";

import { shouldUseLocalTestStorage } from "@/lib/local-test/mode";

import { readJson, writeJson } from "@/lib/local-test/storage";

import type { StageCoachLink, StageJoueurLink } from "@/lib/types/stage-services";



const LOCAL_JOUEURS_KEY = "stage_joueurs";

const LOCAL_COACHS_KEY = "stage_coachs";

function localGetStageJoueurs(): StageJoueurLink[] {

  return readJson<StageJoueurLink[]>(LOCAL_JOUEURS_KEY, []);

}



function localGetStageCoachs(): StageCoachLink[] {

  return readJson<StageCoachLink[]>(LOCAL_COACHS_KEY, []);

}



export async function getStageJoueurs(stageId?: string): Promise<StageJoueurLink[]> {

  if (shouldUseLocalTestStorage()) {

    const all = localGetStageJoueurs();

    return stageId ? all.filter((l) => l.stage_id === stageId) : all;

  }

  await guardReadAccess();

  const supabase = await getSupabaseDataClient();

  let q = supabase.from("stage_joueurs").select("stage_id, joueur_id");

  if (stageId) q = q.eq("stage_id", stageId);

  const { data, error } = await q;

  if (error) throw new Error(error.message);

  return (data ?? []) as StageJoueurLink[];

}



export async function getStageCoachs(stageId?: string): Promise<StageCoachLink[]> {

  if (shouldUseLocalTestStorage()) {

    const all = localGetStageCoachs();

    return stageId ? all.filter((l) => l.stage_id === stageId) : all;

  }

  await guardReadAccess();

  const supabase = await getSupabaseDataClient();

  let q = supabase.from("stage_coachs").select("stage_id, coach_id");

  if (stageId) q = q.eq("stage_id", stageId);

  const { data, error } = await q;

  if (error) throw new Error(error.message);

  return (data ?? []) as StageCoachLink[];

}



export async function getStagesForJoueur(joueurId: string): Promise<StageJoueurLink[]> {

  if (shouldUseLocalTestStorage()) {

    return localGetStageJoueurs().filter((l) => l.joueur_id === joueurId);

  }

  await guardReadAccess();

  const supabase = await getSupabaseDataClient();

  const { data, error } = await supabase

    .from("stage_joueurs")

    .select("stage_id, joueur_id")

    .eq("joueur_id", joueurId);

  if (error) throw new Error(error.message);

  return (data ?? []) as StageJoueurLink[];

}



export async function getStagesForCoach(coachId: string): Promise<StageCoachLink[]> {

  if (shouldUseLocalTestStorage()) {

    return localGetStageCoachs().filter((l) => l.coach_id === coachId);

  }

  await guardReadAccess();

  const supabase = await getSupabaseDataClient();

  const { data, error } = await supabase

    .from("stage_coachs")

    .select("stage_id, coach_id")

    .eq("coach_id", coachId);

  if (error) throw new Error(error.message);

  return (data ?? []) as StageCoachLink[];

}



export async function linkJoueurToStage(stageId: string, joueurId: string): Promise<void> {

  if (shouldUseLocalTestStorage()) {

    const all = localGetStageJoueurs();

    if (!all.some((l) => l.stage_id === stageId && l.joueur_id === joueurId)) {

      writeJson(LOCAL_JOUEURS_KEY, [...all, { stage_id: stageId, joueur_id: joueurId }]);

    }

    return;

  }

  await guardWriteAccess();

  const supabase = await getSupabaseDataClient();

  const { error } = await supabase

    .from("stage_joueurs")

    .upsert({ stage_id: stageId, joueur_id: joueurId }, { onConflict: "stage_id,joueur_id" });

  if (error) throw new Error(error.message);

}



export async function linkCoachToStage(stageId: string, coachId: string): Promise<void> {

  if (shouldUseLocalTestStorage()) {

    const all = localGetStageCoachs();

    if (!all.some((l) => l.stage_id === stageId && l.coach_id === coachId)) {

      writeJson(LOCAL_COACHS_KEY, [...all, { stage_id: stageId, coach_id: coachId }]);

    }

    return;

  }

  await guardWriteAccess();

  const supabase = await getSupabaseDataClient();

  const { error } = await supabase

    .from("stage_coachs")

    .upsert({ stage_id: stageId, coach_id: coachId }, { onConflict: "stage_id,coach_id" });

  if (error) throw new Error(error.message);

}



export async function linkJoueursToStage(stageId: string, joueurIds: string[]): Promise<number> {

  let linked = 0;

  for (const joueurId of joueurIds) {

    await linkJoueurToStage(stageId, joueurId);

    linked++;

  }

  return linked;

}



export async function linkCoachsToStage(stageId: string, coachIds: string[]): Promise<number> {

  let linked = 0;

  for (const coachId of coachIds) {

    await linkCoachToStage(stageId, coachId);

    linked++;

  }

  return linked;

}



export async function unlinkJoueurFromStage(stageId: string, joueurId: string): Promise<void> {

  if (shouldUseLocalTestStorage()) {

    writeJson(

      LOCAL_JOUEURS_KEY,

      localGetStageJoueurs().filter(

        (l) => !(l.stage_id === stageId && l.joueur_id === joueurId)

      )

    );

    return;

  }

  await guardWriteAccess();

  const supabase = await getSupabaseDataClient();

  const { error } = await supabase

    .from("stage_joueurs")

    .delete()

    .eq("stage_id", stageId)

    .eq("joueur_id", joueurId);

  if (error) throw new Error(error.message);

}



export async function unlinkCoachFromStage(stageId: string, coachId: string): Promise<void> {

  if (shouldUseLocalTestStorage()) {

    writeJson(

      LOCAL_COACHS_KEY,

      localGetStageCoachs().filter(

        (l) => !(l.stage_id === stageId && l.coach_id === coachId)

      )

    );

    return;

  }

  await guardWriteAccess();

  const supabase = await getSupabaseDataClient();

  const { error } = await supabase

    .from("stage_coachs")

    .delete()

    .eq("stage_id", stageId)

    .eq("coach_id", coachId);

  if (error) throw new Error(error.message);

}



export async function deleteStageRelations(stageId: string): Promise<void> {

  if (shouldUseLocalTestStorage()) {

    writeJson(

      LOCAL_JOUEURS_KEY,

      localGetStageJoueurs().filter((l) => l.stage_id !== stageId)

    );

    writeJson(

      LOCAL_COACHS_KEY,

      localGetStageCoachs().filter((l) => l.stage_id !== stageId)

    );

    return;

  }

  await guardWriteAccess();

  const supabase = await getSupabaseDataClient();

  await supabase.from("stage_joueurs").delete().eq("stage_id", stageId);

  await supabase.from("stage_coachs").delete().eq("stage_id", stageId);

}


