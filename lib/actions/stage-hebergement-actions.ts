"use server";

import { revalidatePath } from "next/cache";
import { getAuthUserFromServer } from "@/lib/auth/server-session";
import { resolveEffectiveAppRole } from "@/lib/auth/passeports-access";
import {
  getHebergementByStageServer,
  saveHebergementForStageServer,
} from "@/lib/data/stage-hebergement.server";
import { getStageParticipantsServer } from "@/lib/data/stage-relations.server";
import type { HebergementStageV2, StageHebergementForm, StageProgrammeV2 } from "@/lib/types/v2";
import { hebergementToForm, totalChambresFromForm } from "@/lib/v2/stage-hebergement-form";

function canManage(role: string): boolean {
  return role === "admin" || role === "entraineur" || role === "direction" || role === "viewer";
}

export async function getStageHebergementAction(
  stageId: string
): Promise<HebergementStageV2 | null> {
  const user = await getAuthUserFromServer();
  if (!user) return null;
  return getHebergementByStageServer(stageId);
}

export async function saveStageHebergementAction(
  stageId: string,
  form: StageHebergementForm,
  statut?: string
): Promise<{
  ok: boolean;
  hebergement: HebergementStageV2 | null;
  stagePatch?: Pick<StageProgrammeV2, "hebergement" | "chambres">;
  error?: string;
}> {
  const user = await getAuthUserFromServer();
  if (!user) return { ok: false, hebergement: null, error: "Non authentifié" };
  const role = resolveEffectiveAppRole(user);
  if (!canManage(role)) {
    return { ok: false, hebergement: null, error: "Droits insuffisants" };
  }

  const { joueurs, coachs } = await getStageParticipantsServer(stageId);
  const totalChambres = form.actif ? totalChambresFromForm(form) : 0;

  const result = await saveHebergementForStageServer({
    stageId,
    actif: form.actif,
    form,
    statut,
    nbJoueurs: joueurs.length,
    nbCoachs: coachs.length,
  });

  if (result.error) {
    return { ok: false, hebergement: null, error: result.error };
  }

  revalidatePath(`/v2/stages/${stageId}`);
  revalidatePath("/v2/hebergement");
  revalidatePath("/v2/stages");

  return {
    ok: true,
    hebergement: result.hebergement,
    stagePatch: {
      hebergement: form.actif,
      chambres: form.actif ? totalChambres : 0,
    },
  };
}

/** Crée l'hébergement si le stage est marqué hébergement mais sans fiche détaillée. */
export async function provisionStageHebergementAction(stageId: string): Promise<{
  ok: boolean;
  hebergement: HebergementStageV2 | null;
  error?: string;
}> {
  const user = await getAuthUserFromServer();
  if (!user) return { ok: false, hebergement: null, error: "Non authentifié" };

  const existing = await getHebergementByStageServer(stageId);
  if (existing) return { ok: true, hebergement: existing };

  const { joueurs, coachs } = await getStageParticipantsServer(stageId);

  const { getSupabaseServerDataClient } = await import("@/lib/supabase/data-client.server");
  const supabase = await getSupabaseServerDataClient();
  const { data: stage } = await supabase
    .from("stages_programme")
    .select("date_debut, date_fin, hebergement")
    .eq("id", stageId)
    .maybeSingle();

  if (!stage) return { ok: false, hebergement: null, error: "Stage introuvable" };

  const form = hebergementToForm(
    {
      date_debut: stage.date_debut as string,
      date_fin: stage.date_fin as string,
      hebergement: true,
    },
    null,
    joueurs,
    coachs
  );
  form.actif = true;

  return saveStageHebergementAction(stageId, form, "prevu");
}
