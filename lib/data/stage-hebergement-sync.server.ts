import "server-only";

import {
  effectiveParticipantDates,
  embedParticipantsDatesInRemarques,
} from "@/lib/hebergement/participants-dates";
import { getSupabaseServerDataClient } from "@/lib/supabase/data-client.server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  embedLogistiqueInNotes,
  parseLogistiqueFromNotes,
} from "@/lib/stages/stage-logistique-serializer";
import type { HebergementParticipantDates, StageHebergementForm } from "@/lib/types/v2";

const STAGES = "stages_programme";

/** Met à jour le pack logistique dans les notes du stage (sync calendrier / autres onglets). */
export async function syncStageLogistiqueParticipantDates(
  stageId: string,
  participants: HebergementParticipantDates[]
): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const supabase = await getSupabaseServerDataClient();
  const { data: stage } = await supabase
    .from(STAGES)
    .select("notes")
    .eq("id", stageId)
    .maybeSingle();
  if (!stage) return;

  const pack = parseLogistiqueFromNotes((stage.notes as string) ?? null) ?? {
    joueur_ids: [],
    entraineur_ids: [],
    hebergement: null,
    restauration: null,
    terrains: null,
  };

  pack.hebergement_participants_dates = participants.map((p) => ({
    personne_id: p.personne_id,
    personne_type: p.personne_type,
    date_debut: p.date_debut,
    date_fin: p.date_fin,
    dates_personnalisees: p.dates_personnalisees,
  }));

  const notes = embedLogistiqueInNotes((stage.notes as string) ?? null, pack);
  await supabase.from(STAGES).update({ notes, updated_at: new Date().toISOString() }).eq("id", stageId);
}

/** Propage les dates vers occupations_chambre du stage (si table migrée). */
export async function syncOccupationsDatesFromParticipants(
  stageId: string,
  form: StageHebergementForm,
  people: { id: string; nom: string; prenom: string; type: "joueur" | "entraineur" }[]
): Promise<void> {
  if (!isSupabaseConfigured() || !form.actif) return;
  const supabase = await getSupabaseServerDataClient();

  const { data: occupations, error } = await supabase
    .from("occupations_chambre")
    .select("id, occupant_id, occupant_type")
    .eq("stage_id", stageId);

  if (error) return;

  const rowByPerson = new Map(
    form.participants_dates.map((r) => [`${r.personne_type}:${r.personne_id}`, r])
  );

  for (const person of people) {
    const key = `${person.type}:${person.id}`;
    const row = rowByPerson.get(key);
    if (!row) continue;
    const { date_debut, date_fin } = effectiveParticipantDates(
      row,
      form.date_debut,
      form.date_fin
    );
    const occ = (occupations ?? []).find(
      (o) => o.occupant_id === person.id && o.occupant_type === person.type
    );
    if (!occ?.id) continue;
    await supabase
      .from("occupations_chambre")
      .update({ date_arrivee: date_debut, date_depart: date_fin })
      .eq("id", occ.id as string);
  }
}

export function buildHebergementRemarquesPayload(form: StageHebergementForm): {
  remarques: string | null;
  participants_dates: { actif: boolean; rows: HebergementParticipantDates[] };
} {
  const store = {
    actif: !!form.dates_participants_actif,
    rows: form.dates_participants_actif ? form.participants_dates ?? [] : [],
  };
  return {
    participants_dates: store,
    remarques: embedParticipantsDatesInRemarques(form.remarques || null, store) || null,
  };
}
