"use server";

import { revalidatePath } from "next/cache";
import { getAuthUserFromServer } from "@/lib/auth/server-session";
import { resolveEffectiveAppRole } from "@/lib/auth/passeports-access";
import { getEntraineurs } from "@/lib/data/entraineurs";
import { getJoueurs } from "@/lib/data/joueurs";
import {
  getStageParticipantsServer,
  linkCoachToStageServer,
  linkCoachsToStageServer,
  linkJoueurToStageServer,
  linkJoueursToStageServer,
  unlinkCoachFromStageServer,
  unlinkJoueurFromStageServer,
} from "@/lib/data/stage-relations.server";
import type { AppRole } from "@/lib/types/app-roles";
import type { EntraineurV2, JoueurV2 } from "@/lib/types/v2";

function canManageStageParticipants(role: AppRole): boolean {
  return role === "admin" || role === "entraineur" || role === "direction" || role === "viewer";
}

function formatStageParticipantError(e: unknown): string {
  const msg = e instanceof Error ? e.message : "Erreur d'affectation";
  if (msg.includes("stage_coachs_stage_id_fkey") || msg.includes("stage_joueurs_stage_id_fkey")) {
    return "Configuration base de données : exécutez supabase/apply-stage-participants-fk.sql dans Supabase (liaison stages_programme).";
  }
  if (msg.includes("stage_coachs_coach_id_fkey")) {
    return "Cet entraîneur n'existe pas en base ou la liaison coach est mal configurée (script apply-stage-participants-fk.sql).";
  }
  if (msg.includes("stage_joueurs_joueur_id_fkey")) {
    return "Ce joueur n'existe pas en base.";
  }
  if (msg.includes("row-level security")) {
    return "Droits insuffisants : exécutez supabase/apply-stage-participants-rls.sql dans Supabase.";
  }
  return msg;
}

async function requireManageAccess(): Promise<{ ok: true; role: AppRole } | { ok: false; error: string }> {
  const user = await getAuthUserFromServer();
  if (!user) return { ok: false, error: "Non authentifié" };
  const role = resolveEffectiveAppRole(user);
  if (!canManageStageParticipants(role)) {
    return { ok: false, error: "Droits insuffisants pour modifier les participants" };
  }
  return { ok: true, role };
}

function revalidateStage(stageId: string) {
  revalidatePath(`/v2/stages/${stageId}`);
  revalidatePath("/v2/stages");
}

export async function getStageParticipantsAction(
  stageId: string
): Promise<{ joueurs: JoueurV2[]; coachs: EntraineurV2[] }> {
  const user = await getAuthUserFromServer();
  if (!user) return { joueurs: [], coachs: [] };
  return getStageParticipantsServer(stageId);
}

/** Catalogue complet — lecture sans session stricte (même source que les fiches joueurs/coachs). */
export async function getStageParticipantCatalogAction(): Promise<{
  joueurs: JoueurV2[];
  coachs: EntraineurV2[];
}> {
  const [joueurs, coachs] = await Promise.all([getJoueurs(), getEntraineurs()]);
  return {
    joueurs: joueurs as unknown as JoueurV2[],
    coachs: coachs as unknown as EntraineurV2[],
  };
}

export async function assignJoueurToStageAction(
  stageId: string,
  joueurId: string
): Promise<{ ok: boolean; error?: string; joueurs?: JoueurV2[]; coachs?: EntraineurV2[] }> {
  const access = await requireManageAccess();
  if (!access.ok) return access;
  try {
    await linkJoueurToStageServer(stageId, joueurId);
    revalidateStage(stageId);
    const participants = await getStageParticipantsServer(stageId);
    return { ok: true, ...participants };
  } catch (e) {
    return { ok: false, error: formatStageParticipantError(e) };
  }
}

export async function assignCoachToStageAction(
  stageId: string,
  coachId: string
): Promise<{ ok: boolean; error?: string; joueurs?: JoueurV2[]; coachs?: EntraineurV2[] }> {
  const access = await requireManageAccess();
  if (!access.ok) return access;
  try {
    await linkCoachToStageServer(stageId, coachId);
    revalidateStage(stageId);
    const participants = await getStageParticipantsServer(stageId);
    return { ok: true, ...participants };
  } catch (e) {
    return { ok: false, error: formatStageParticipantError(e) };
  }
}

export async function assignJoueursToStageAction(
  stageId: string,
  joueurIds: string[]
): Promise<{ ok: boolean; linked: number; error?: string }> {
  const access = await requireManageAccess();
  if (!access.ok) return { ...access, linked: 0 };
  if (joueurIds.length === 0) return { ok: true, linked: 0 };
  try {
    const linked = await linkJoueursToStageServer(stageId, joueurIds);
    revalidateStage(stageId);
    const participants = await getStageParticipantsServer(stageId);
    return { ok: true, linked, ...participants };
  } catch (e) {
    return {
      ok: false,
      linked: 0,
      error: formatStageParticipantError(e),
    };
  }
}

export async function assignCoachsToStageAction(
  stageId: string,
  coachIds: string[]
): Promise<{ ok: boolean; linked: number; error?: string }> {
  const access = await requireManageAccess();
  if (!access.ok) return { ...access, linked: 0 };
  if (coachIds.length === 0) return { ok: true, linked: 0 };
  try {
    const linked = await linkCoachsToStageServer(stageId, coachIds);
    revalidateStage(stageId);
    const participants = await getStageParticipantsServer(stageId);
    return { ok: true, linked, ...participants };
  } catch (e) {
    return {
      ok: false,
      linked: 0,
      error: formatStageParticipantError(e),
    };
  }
}

export async function removeJoueurFromStageAction(
  stageId: string,
  joueurId: string
): Promise<{ ok: boolean; error?: string }> {
  const access = await requireManageAccess();
  if (!access.ok) return access;
  try {
    await unlinkJoueurFromStageServer(stageId, joueurId);
    revalidateStage(stageId);
    const participants = await getStageParticipantsServer(stageId);
    return { ok: true, ...participants };
  } catch (e) {
    return { ok: false, error: formatStageParticipantError(e) };
  }
}

export async function removeCoachFromStageAction(
  stageId: string,
  coachId: string
): Promise<{ ok: boolean; error?: string }> {
  const access = await requireManageAccess();
  if (!access.ok) return access;
  try {
    await unlinkCoachFromStageServer(stageId, coachId);
    revalidateStage(stageId);
    const participants = await getStageParticipantsServer(stageId);
    return { ok: true, ...participants };
  } catch (e) {
    return { ok: false, error: formatStageParticipantError(e) };
  }
}
