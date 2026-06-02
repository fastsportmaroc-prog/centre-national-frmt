import "server-only";

import { localGetEntraineurs, localGetJoueurs } from "@/lib/local-test/data-access";
import { shouldUseLocalTestStorage } from "@/lib/local-test/mode";
import { readJson, writeJson } from "@/lib/local-test/storage";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { guardWriteAccess } from "@/lib/supabase/data-access-guard";
import { getSupabaseServerDataClient } from "@/lib/supabase/data-client.server";
import type { EntraineurV2, JoueurV2 } from "@/lib/types/v2";
import type { StageCoachLink, StageJoueurLink } from "@/lib/types/stage-services";

const LOCAL_JOUEURS_KEY = "stage_joueurs";
const LOCAL_COACHS_KEY = "stage_coachs";

function localGetStageJoueurs(): StageJoueurLink[] {
  return readJson<StageJoueurLink[]>(LOCAL_JOUEURS_KEY, []);
}

function localGetStageCoachs(): StageCoachLink[] {
  return readJson<StageCoachLink[]>(LOCAL_COACHS_KEY, []);
}

/** Met à jour nombre_joueurs / nombre_encadrants depuis stage_joueurs & stage_coachs. */
export async function syncStageParticipantCountsServer(
  stageId: string
): Promise<{ joueurs: number; coachs: number }> {
  const { joueurs, coachs } = await getStageParticipantsServer(stageId);
  const nbJoueurs = joueurs.length;
  const nbCoachs = coachs.length;

  if (!shouldUseLocalTestStorage() && isSupabaseConfigured()) {
    await guardWriteAccess();
    const supabase = await getSupabaseServerDataClient();
    const { error } = await supabase
      .from("stages_programme")
      .update({
        nombre_joueurs: nbJoueurs,
        nombre_encadrants: nbCoachs,
        updated_at: new Date().toISOString(),
      })
      .eq("id", stageId);
    if (error) console.warn("[syncStageParticipantCounts]", error.message);
  }

  return { joueurs: nbJoueurs, coachs: nbCoachs };
}

export async function linkJoueurToStageServer(stageId: string, joueurId: string): Promise<void> {
  if (shouldUseLocalTestStorage()) {
    const all = localGetStageJoueurs();
    if (!all.some((l) => l.stage_id === stageId && l.joueur_id === joueurId)) {
      writeJson(LOCAL_JOUEURS_KEY, [...all, { stage_id: stageId, joueur_id: joueurId }]);
    }
    await syncStageParticipantCountsServer(stageId);
    return;
  }

  await guardWriteAccess();
  const supabase = await getSupabaseServerDataClient();
  const { error } = await supabase
    .from("stage_joueurs")
    .upsert({ stage_id: stageId, joueur_id: joueurId }, { onConflict: "stage_id,joueur_id" });
  if (error) throw new Error(error.message);
  await syncStageParticipantCountsServer(stageId);
}

export async function linkCoachToStageServer(stageId: string, coachId: string): Promise<void> {
  if (shouldUseLocalTestStorage()) {
    const all = localGetStageCoachs();
    if (!all.some((l) => l.stage_id === stageId && l.coach_id === coachId)) {
      writeJson(LOCAL_COACHS_KEY, [...all, { stage_id: stageId, coach_id: coachId }]);
    }
    await syncStageParticipantCountsServer(stageId);
    return;
  }

  await guardWriteAccess();
  const supabase = await getSupabaseServerDataClient();
  const { error } = await supabase
    .from("stage_coachs")
    .upsert({ stage_id: stageId, coach_id: coachId }, { onConflict: "stage_id,coach_id" });
  if (error) throw new Error(error.message);
  await syncStageParticipantCountsServer(stageId);
}

export async function linkJoueursToStageServer(stageId: string, joueurIds: string[]): Promise<number> {
  let linked = 0;
  for (const joueurId of joueurIds) {
    if (shouldUseLocalTestStorage()) {
      const all = localGetStageJoueurs();
      if (!all.some((l) => l.stage_id === stageId && l.joueur_id === joueurId)) {
        writeJson(LOCAL_JOUEURS_KEY, [...all, { stage_id: stageId, joueur_id: joueurId }]);
      }
    } else {
      await guardWriteAccess();
      const supabase = await getSupabaseServerDataClient();
      const { error } = await supabase
        .from("stage_joueurs")
        .upsert({ stage_id: stageId, joueur_id: joueurId }, { onConflict: "stage_id,joueur_id" });
      if (error) throw new Error(error.message);
    }
    linked++;
  }
  await syncStageParticipantCountsServer(stageId);
  return linked;
}

export async function linkCoachsToStageServer(stageId: string, coachIds: string[]): Promise<number> {
  let linked = 0;
  for (const coachId of coachIds) {
    if (shouldUseLocalTestStorage()) {
      const all = localGetStageCoachs();
      if (!all.some((l) => l.stage_id === stageId && l.coach_id === coachId)) {
        writeJson(LOCAL_COACHS_KEY, [...all, { stage_id: stageId, coach_id: coachId }]);
      }
    } else {
      await guardWriteAccess();
      const supabase = await getSupabaseServerDataClient();
      const { error } = await supabase
        .from("stage_coachs")
        .upsert({ stage_id: stageId, coach_id: coachId }, { onConflict: "stage_id,coach_id" });
      if (error) throw new Error(error.message);
    }
    linked++;
  }
  await syncStageParticipantCountsServer(stageId);
  return linked;
}

export async function unlinkJoueurFromStageServer(stageId: string, joueurId: string): Promise<void> {
  if (shouldUseLocalTestStorage()) {
    writeJson(
      LOCAL_JOUEURS_KEY,
      localGetStageJoueurs().filter((l) => !(l.stage_id === stageId && l.joueur_id === joueurId))
    );
    await syncStageParticipantCountsServer(stageId);
    return;
  }

  await guardWriteAccess();
  const supabase = await getSupabaseServerDataClient();
  const { error } = await supabase
    .from("stage_joueurs")
    .delete()
    .eq("stage_id", stageId)
    .eq("joueur_id", joueurId);
  if (error) throw new Error(error.message);
  await syncStageParticipantCountsServer(stageId);
}

/** Lecture participants — même client serveur que les écritures (session cookies). */
export async function getStageParticipantsServer(
  stageId: string
): Promise<{ joueurs: JoueurV2[]; coachs: EntraineurV2[] }> {
  const sid = decodeURIComponent(stageId.trim());
  if (!sid) return { joueurs: [], coachs: [] };

  if (!isSupabaseConfigured()) {
    const joueurIds = new Set(
      localGetStageJoueurs().filter((l) => l.stage_id === sid).map((l) => l.joueur_id)
    );
    const coachIds = new Set(
      localGetStageCoachs().filter((l) => l.stage_id === sid).map((l) => l.coach_id)
    );
    return {
      joueurs: localGetJoueurs().filter((j) => joueurIds.has(j.id)) as unknown as JoueurV2[],
      coachs: localGetEntraineurs().filter((c) => coachIds.has(c.id)) as unknown as EntraineurV2[],
    };
  }

  const supabase = await getSupabaseServerDataClient();

  const [{ data: linksJ }, { data: linksC }] = await Promise.all([
    supabase.from("stage_joueurs").select("joueur_id").eq("stage_id", sid),
    supabase.from("stage_coachs").select("coach_id").eq("stage_id", sid),
  ]);

  const joueurIds = (linksJ ?? []).map((r) => r.joueur_id as string);
  const coachIds = (linksC ?? []).map((r) => r.coach_id as string);

  const [jRes, cRes] = await Promise.all([
    joueurIds.length > 0
      ? supabase.from("joueurs").select("*").in("id", joueurIds).order("nom")
      : Promise.resolve({ data: [] as JoueurV2[], error: null }),
    coachIds.length > 0
      ? supabase.from("entraineurs").select("*").in("id", coachIds).order("nom")
      : Promise.resolve({ data: [] as EntraineurV2[], error: null }),
  ]);

  if (jRes.error) console.warn("[getStageParticipantsServer] joueurs:", jRes.error.message);
  if (cRes.error) console.warn("[getStageParticipantsServer] coachs:", cRes.error.message);

  return {
    joueurs: (jRes.data ?? []) as JoueurV2[],
    coachs: (cRes.data ?? []) as EntraineurV2[],
  };
}

export async function unlinkCoachFromStageServer(stageId: string, coachId: string): Promise<void> {
  if (shouldUseLocalTestStorage()) {
    writeJson(
      LOCAL_COACHS_KEY,
      localGetStageCoachs().filter((l) => !(l.stage_id === stageId && l.coach_id === coachId))
    );
    await syncStageParticipantCountsServer(stageId);
    return;
  }

  await guardWriteAccess();
  const supabase = await getSupabaseServerDataClient();
  const { error } = await supabase
    .from("stage_coachs")
    .delete()
    .eq("stage_id", stageId)
    .eq("coach_id", coachId);
  if (error) throw new Error(error.message);
  await syncStageParticipantCountsServer(stageId);
}
