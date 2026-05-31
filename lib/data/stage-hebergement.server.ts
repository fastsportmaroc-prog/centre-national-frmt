import "server-only";

import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getSupabaseServerDataClient } from "@/lib/supabase/data-client.server";
import {
  buildHebergementRemarquesPayload,
  syncOccupationsDatesFromParticipants,
  syncStageLogistiqueParticipantDates,
} from "@/lib/data/stage-hebergement-sync.server";
import { getStageParticipantsServer } from "@/lib/data/stage-relations.server";
import type { HebergementStageV2, StageHebergementForm } from "@/lib/types/v2";
import { hebergementToForm, totalChambresFromForm } from "@/lib/v2/stage-hebergement-form";
export { hebergementToForm };

const HEBERGEMENTS = "hebergements";
const STAGES = "stages_programme";

export async function getHebergementByStageServer(
  stageId: string
): Promise<HebergementStageV2 | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = await getSupabaseServerDataClient();
  const { data, error } = await supabase
    .from(HEBERGEMENTS)
    .select("*")
    .eq("stage_id", stageId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.warn("[getHebergementByStageServer]", error.message);
    return null;
  }
  return (data ?? null) as HebergementStageV2 | null;
}

export type SaveStageHebergementInput = {
  stageId: string;
  actif: boolean;
  form: StageHebergementForm;
  statut?: string;
  nbJoueurs: number;
  nbCoachs: number;
};

export async function saveHebergementForStageServer(
  input: SaveStageHebergementInput
): Promise<{ hebergement: HebergementStageV2 | null; error?: string }> {
  const { stageId, actif, form, nbJoueurs, nbCoachs } = input;
  const statut = input.statut ?? "prevu";

  if (!isSupabaseConfigured()) {
    return { hebergement: null, error: "Supabase non configuré" };
  }

  const supabase = await getSupabaseServerDataClient();
  const existing = await getHebergementByStageServer(stageId);

  const nbJ = actif ? Math.max(0, Math.round(form.nb_chambres_joueurs)) : 0;
  const nbC = actif ? Math.max(0, Math.round(form.nb_chambres_coachs)) : 0;
  const totalChambres = nbJ + nbC;

  const { error: stageErr } = await supabase
    .from(STAGES)
    .update({
      hebergement: actif,
      chambres: totalChambres,
      updated_at: new Date().toISOString(),
    })
    .eq("id", stageId);

  if (stageErr) {
    return { hebergement: null, error: stageErr.message };
  }

  if (!actif) {
    if (existing?.id) {
      await supabase.from(HEBERGEMENTS).delete().eq("id", existing.id);
    }
    return { hebergement: null };
  }

  const { remarques, participants_dates } = buildHebergementRemarquesPayload(form);

  const payload: Record<string, unknown> = {
    stage_id: stageId,
    date_debut: form.date_debut,
    date_fin: form.date_fin,
    type_chambre_joueurs: form.type_chambre_joueurs,
    type_chambre_coachs: form.type_chambre_coachs,
    nb_chambres_joueurs: nbJ,
    nb_chambres_coachs: nbC,
    kitchenette: form.kitchenette,
    remarques,
    participants_dates,
    statut,
    nom_chambre: `Bloc stage`,
    type_chambre: form.type_chambre_joueurs,
    type_chambre_code: form.type_chambre_joueurs,
    capacite: Math.max(1, totalChambres),
    occupe: false,
  };

  let saved: HebergementStageV2 | null = null;

  if (existing?.id) {
    const { data, error } = await supabase
      .from(HEBERGEMENTS)
      .update(payload)
      .eq("id", existing.id)
      .select()
      .single();
    if (error) {
      const fallback = { ...payload };
      delete fallback.participants_dates;
      fallback.remarques = remarques;
      const retry = await supabase
        .from(HEBERGEMENTS)
        .update(fallback)
        .eq("id", existing.id)
        .select()
        .single();
      if (retry.error) return { hebergement: null, error: retry.error.message };
      saved = {
        ...(retry.data as HebergementStageV2),
        participants_dates,
        remarques: remarques ?? undefined,
      } as HebergementStageV2;
    } else {
      saved = data as HebergementStageV2;
    }
  } else {
    const { data, error } = await supabase.from(HEBERGEMENTS).insert(payload).select().single();
    if (error) {
      const fallback = { ...payload };
      delete fallback.participants_dates;
      fallback.remarques = remarques;
      const retry = await supabase.from(HEBERGEMENTS).insert(fallback).select().single();
      if (retry.error) return { hebergement: null, error: retry.error.message };
      saved = {
        ...(retry.data as HebergementStageV2),
        participants_dates,
        remarques: remarques ?? undefined,
      } as HebergementStageV2;
    } else {
      saved = data as HebergementStageV2;
    }
  }

  if (!saved) return { hebergement: null, error: "Enregistrement impossible" };

  if (participants_dates.actif) {
    await syncStageLogistiqueParticipantDates(stageId, participants_dates.rows);
  }

  const { joueurs, coachs } = await getStageParticipantsServer(stageId);
  const people = [
    ...joueurs.map((j) => ({
      id: j.id,
      nom: j.nom,
      prenom: j.prenom,
      type: "joueur" as const,
    })),
    ...coachs.map((c) => ({
      id: c.id,
      nom: c.nom,
      prenom: c.prenom,
      type: "entraineur" as const,
    })),
  ];
  if (form.dates_participants_actif) {
    await syncOccupationsDatesFromParticipants(stageId, form, people);
  }

  return { hebergement: saved };
}
