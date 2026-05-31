"use server";

import { revalidatePath } from "next/cache";
import {
  getKinesitherapieByStage,
  getKinesitherapieSeancesForJoueurs,
  getKinesitherapieStageParticipants,
  joueurIdsFromSeancesOnPeriod,
  replaceKinesitherapieStageParticipants,
  upsertKinesitherapieStage,
} from "@/lib/data/kinesitherapie";
import { revalidateStageLinkedPaths } from "@/lib/server/revalidate-stage-paths";
import { getStageById, updateStage } from "@/lib/supabase/queries";
import type { JoueurV2, KinesitherapieStageV2 } from "@/lib/types/v2";

export type StageKinesitherapieBundle = {
  config: KinesitherapieStageV2 | null;
  selectedJoueurIds: string[];
  suggestedJoueurIds: string[];
  stageKinesitherapieFlag: boolean;
};

export async function getStageKinesitherapieAction(
  stageId: string,
  joueurIds: string[]
): Promise<StageKinesitherapieBundle> {
  const stage = await getStageById(stageId);
  const dateDebut = stage?.date_debut ?? "";
  const dateFin = stage?.date_fin ?? "";

  const [config, participants, seances] = await Promise.all([
    getKinesitherapieByStage(stageId),
    getKinesitherapieStageParticipants(stageId),
    dateDebut && dateFin
      ? getKinesitherapieSeancesForJoueurs(joueurIds, dateDebut, dateFin)
      : getKinesitherapieSeancesForJoueurs(joueurIds),
  ]);

  const suggestedJoueurIds = joueurIdsFromSeancesOnPeriod(seances, joueurIds, dateDebut, dateFin);
  const selectedJoueurIds = participants
    .filter((p) => p.personne_type === "joueur")
    .map((p) => p.personne_id);

  return {
    config,
    selectedJoueurIds,
    suggestedJoueurIds,
    stageKinesitherapieFlag: Boolean(stage?.kinesitherapie ?? config?.actif),
  };
}

export async function saveStageKinesitherapieAction(input: {
  stageId: string;
  actif: boolean;
  dateDebut: string;
  dateFin: string;
  remarques: string;
  selectedJoueurIds: string[];
  suggestedJoueurIds: string[];
}): Promise<{ ok: boolean; error?: string }> {
  const { stageId, actif, dateDebut, dateFin, remarques, selectedJoueurIds, suggestedJoueurIds } =
    input;

  const stageUp = await updateStage(stageId, { kinesitherapie: actif });
  if (!stageUp.ok) {
    if (/column|schema cache|kinesitherapie/i.test(stageUp.error ?? "")) {
      return {
        ok: false,
        error:
          "Colonne kinésithérapie absente. Exécutez lib/db/migrations/kinesitherapie.sql dans Supabase.",
      };
    }
    return { ok: false, error: stageUp.error };
  }

  if (!actif) {
    await upsertKinesitherapieStage({
      stage_id: stageId,
      actif: false,
      date_debut: dateDebut || null,
      date_fin: dateFin || null,
      remarques: remarques || null,
      statut: "annule",
    });
    await replaceKinesitherapieStageParticipants(stageId, []);
    revalidateStageLinkedPaths(stageId);
    revalidatePath("/v2/kinesitherapie");
    return { ok: true };
  }

  const { error: upErr } = await upsertKinesitherapieStage({
    stage_id: stageId,
    actif: true,
    date_debut: dateDebut || null,
    date_fin: dateFin || null,
    remarques: remarques || null,
    statut: "prevu",
  });
  if (upErr) return { ok: false, error: upErr };

  const suggestedSet = new Set(suggestedJoueurIds);
  const rows = selectedJoueurIds.map((personne_id) => ({
    personne_id,
    personne_type: "joueur" as const,
    auto_from_seance: suggestedSet.has(personne_id),
  }));

  const partRes = await replaceKinesitherapieStageParticipants(stageId, rows);
  if (!partRes.ok) return partRes;

  revalidateStageLinkedPaths(stageId);
  revalidatePath("/v2/kinesitherapie");
  return { ok: true };
}
