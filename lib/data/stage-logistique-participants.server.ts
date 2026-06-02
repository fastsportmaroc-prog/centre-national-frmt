import "server-only";

import { getSupabaseServerDataClient } from "@/lib/supabase/data-client.server";
import { getStageParticipantsServer } from "@/lib/data/stage-relations.server";
import { eachDayOfStage } from "@/lib/v2/stage-calculations";
import type {
  HebergementParticipantDates,
  HebergementParticipantRow,
  InterneChambreV2,
  JourRepasStage,
  ParticipantMealOverride,
  StageLogistiqueParticipantType,
} from "@/lib/types/v2";

const STAGES = "stages_programme";

function toDbCoachType(t: "joueur" | "entraineur"): StageLogistiqueParticipantType {
  return t === "entraineur" ? "coach" : "joueur";
}

function fromDbCoachType(t: string): "joueur" | "entraineur" {
  return t === "coach" ? "entraineur" : "joueur";
}

function normalizeStatut(s: string | null | undefined): HebergementParticipantRow["statut"] {
  const v = (s ?? "").toLowerCase();
  if (v.includes("attente")) return "en attente";
  if (v.includes("annul")) return "annulé";
  return "confirmé";
}

export async function loadStageHebergementParticipants(
  stageId: string
): Promise<{ participants: HebergementParticipantRow[]; stageDates: { debut: string; fin: string } }> {
  const supabase = await getSupabaseServerDataClient();
  const [{ data: stage }, { joueurs, coachs }, { data: rows }, { data: chambres }] = await Promise.all([
    supabase.from(STAGES).select("date_debut, date_fin").eq("id", stageId).maybeSingle(),
    getStageParticipantsServer(stageId),
    supabase.from("stage_hebergement_participants").select("*").eq("stage_id", stageId),
    supabase
      .from("interne_chambres")
      .select("id, numero, batiment, type, genre, capacite, statut, notes, created_at")
      .order("numero"),
  ]);

  const debut = String(stage?.date_debut ?? "").slice(0, 10);
  const fin = String(stage?.date_fin ?? "").slice(0, 10);
  const chambreById = new Map(
    ((chambres ?? []) as InterneChambreV2[]).map((c) => [c.id, c])
  );
  const byKey = new Map(
    (rows ?? []).map((r) => [
      `${r.participant_type}:${r.participant_id}`,
      r as Record<string, unknown>,
    ])
  );

  const participants: HebergementParticipantRow[] = [];

  for (const j of joueurs) {
    const key = `joueur:${j.id}`;
    const ex = byKey.get(key);
    const chId = (ex?.chambre_id as string | null) ?? null;
    const ch = chId ? chambreById.get(chId) : undefined;
    participants.push({
      id: ex?.id as string | undefined,
      stage_id: stageId,
      participant_id: j.id,
      participant_type: "joueur",
      heberge: ex?.heberge !== false,
      date_arrivee: String(ex?.date_arrivee ?? debut).slice(0, 10),
      date_depart: String(ex?.date_depart ?? fin).slice(0, 10),
      chambre_id: chId,
      statut: normalizeStatut(ex?.statut as string),
      nom: j.nom,
      prenom: j.prenom,
      meta: j.categorie ?? undefined,
      chambre_nom: ch ? `Ch. ${ch.numero ?? "?"}${ch.batiment ? ` · ${ch.batiment}` : ""}` : undefined,
    });
  }

  for (const c of coachs) {
    const key = `coach:${c.id}`;
    const ex = byKey.get(key);
    const chId = (ex?.chambre_id as string | null) ?? null;
    const ch = chId ? chambreById.get(chId) : undefined;
    participants.push({
      id: ex?.id as string | undefined,
      stage_id: stageId,
      participant_id: c.id,
      participant_type: "coach",
      heberge: ex?.heberge !== false,
      date_arrivee: String(ex?.date_arrivee ?? debut).slice(0, 10),
      date_depart: String(ex?.date_depart ?? fin).slice(0, 10),
      chambre_id: chId,
      statut: normalizeStatut(ex?.statut as string),
      nom: c.nom,
      prenom: c.prenom,
      meta: "Coach",
      chambre_nom: ch ? `Ch. ${ch.numero ?? "?"}${ch.batiment ? ` · ${ch.batiment}` : ""}` : undefined,
    });
  }

  return { participants, stageDates: { debut, fin } };
}

export async function listInterneChambresServer(): Promise<InterneChambreV2[]> {
  const supabase = await getSupabaseServerDataClient();
  const { data } = await supabase
    .from("interne_chambres")
    .select("id, numero, batiment, type, genre, capacite, statut, notes, created_at")
    .order("numero");
  return (data ?? []) as InterneChambreV2[];
}

export async function upsertHebergementParticipantServer(
  row: HebergementParticipantRow
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await getSupabaseServerDataClient();
  const payload = {
    stage_id: row.stage_id,
    participant_id: row.participant_id,
    participant_type: row.participant_type,
    heberge: row.heberge,
    date_arrivee: row.date_arrivee,
    date_depart: row.date_depart,
    chambre_id: row.heberge ? row.chambre_id || null : null,
    statut: row.heberge ? row.statut : "annulé",
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("stage_hebergement_participants")
    .upsert(payload, { onConflict: "stage_id,participant_id,participant_type" });

  if (error?.message?.includes("does not exist")) {
    return { ok: false, error: "Table stage_hebergement_participants absente — exécutez la migration 050." };
  }
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function bulkUpsertHebergementParticipantsServer(
  rows: HebergementParticipantRow[]
): Promise<{ ok: boolean; error?: string }> {
  for (const row of rows) {
    const res = await upsertHebergementParticipantServer(row);
    if (!res.ok) return res;
  }
  return { ok: true };
}

/** Sync vers hebergements.participants_dates (lettres / PDF legacy). */
export function hebergementRowsToParticipantDates(
  rows: HebergementParticipantRow[],
  defaultDebut: string,
  defaultFin: string
): HebergementParticipantDates[] {
  return rows.map((r) => ({
    personne_id: r.participant_id,
    personne_type: fromDbCoachType(r.participant_type),
    date_debut: r.date_arrivee,
    date_fin: r.date_depart,
    dates_personnalisees:
      !r.heberge ||
      r.date_arrivee !== defaultDebut ||
      r.date_depart !== defaultFin,
  }));
}

export async function loadStageRestaurationDetail(stageId: string): Promise<{
  jours: JourRepasStage[];
  overrides: ParticipantMealOverride[];
  participants: Array<{
    id: string;
    type: StageLogistiqueParticipantType;
    nom: string;
    prenom: string;
  }>;
}> {
  const supabase = await getSupabaseServerDataClient();
  const [{ data: stage }, { joueurs, coachs }, { data: joursRows }, { data: overrideRows }] =
    await Promise.all([
      supabase.from(STAGES).select("date_debut, date_fin").eq("id", stageId).maybeSingle(),
      getStageParticipantsServer(stageId),
      supabase.from("stage_restauration_jours").select("*").eq("stage_id", stageId),
      supabase.from("stage_restauration_participants").select("*").eq("stage_id", stageId),
    ]);

  const debut = String(stage?.date_debut ?? "").slice(0, 10);
  const fin = String(stage?.date_fin ?? "").slice(0, 10);
  const dates = eachDayOfStage(debut, fin);

  const jours: JourRepasStage[] = dates.map((date) => {
    const ex = (joursRows ?? []).find((j) => String(j.date).slice(0, 10) === date);
    return {
      date,
      petit_dejeuner: ex?.petit_dejeuner ?? true,
      dejeuner: ex?.dejeuner ?? true,
      diner: ex?.diner ?? true,
    };
  });

  const overrides: ParticipantMealOverride[] = (overrideRows ?? []).map((o) => ({
    id: o.id as string,
    participant_id: o.participant_id as string,
    participant_type: o.participant_type as StageLogistiqueParticipantType,
    date: String(o.date).slice(0, 10),
    petit_dejeuner: o.petit_dejeuner as boolean | null,
    dejeuner: o.dejeuner as boolean | null,
    diner: o.diner as boolean | null,
  }));

  const participants = [
    ...joueurs.map((j) => ({
      id: j.id,
      type: "joueur" as const,
      nom: j.nom,
      prenom: j.prenom,
    })),
    ...coachs.map((c) => ({
      id: c.id,
      type: "coach" as const,
      nom: c.nom,
      prenom: c.prenom,
    })),
  ];

  return { jours, overrides, participants };
}

export async function saveJourRepasServer(
  stageId: string,
  jour: JourRepasStage
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await getSupabaseServerDataClient();
  const { error } = await supabase.from("stage_restauration_jours").upsert(
    {
      stage_id: stageId,
      date: jour.date,
      petit_dejeuner: jour.petit_dejeuner,
      dejeuner: jour.dejeuner,
      diner: jour.diner,
      is_default: true,
    },
    { onConflict: "stage_id,date" }
  );
  if (error?.message?.includes("does not exist")) {
    return { ok: false, error: "Table stage_restauration_jours absente — migration 050." };
  }
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function saveParticipantMealServer(
  stageId: string,
  override: ParticipantMealOverride
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await getSupabaseServerDataClient();
  const { error } = await supabase.from("stage_restauration_participants").upsert(
    {
      stage_id: stageId,
      participant_id: override.participant_id,
      participant_type: override.participant_type,
      date: override.date,
      petit_dejeuner: override.petit_dejeuner,
      dejeuner: override.dejeuner,
      diner: override.diner,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "stage_id,participant_id,participant_type,date" }
  );
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function deleteParticipantMealOverrideServer(
  stageId: string,
  participantId: string,
  participantType: StageLogistiqueParticipantType,
  date: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await getSupabaseServerDataClient();
  const { error } = await supabase
    .from("stage_restauration_participants")
    .delete()
    .eq("stage_id", stageId)
    .eq("participant_id", participantId)
    .eq("participant_type", participantType)
    .eq("date", date);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export function countEffectiveMealsForDay(
  jours: JourRepasStage[],
  overrides: ParticipantMealOverride[],
  participants: Array<{ id: string; type: StageLogistiqueParticipantType }>,
  date: string,
  meal: keyof Pick<JourRepasStage, "petit_dejeuner" | "dejeuner" | "diner">
): number {
  const dayDefault = jours.find((j) => j.date === date);
  if (!dayDefault?.[meal]) return 0;
  let count = 0;
  for (const p of participants) {
    const ov = overrides.find(
      (o) =>
        o.date === date &&
        o.participant_id === p.id &&
        o.participant_type === p.type
    );
    const effective = ov?.[meal] ?? dayDefault[meal];
    if (effective) count++;
  }
  return count;
}

export function countRepasPrevusStage(
  jours: JourRepasStage[],
  overrides: ParticipantMealOverride[],
  participants: Array<{ id: string; type: StageLogistiqueParticipantType }>
): number {
  let total = 0;
  for (const j of jours) {
    total += countEffectiveMealsForDay(jours, overrides, participants, j.date, "petit_dejeuner");
    total += countEffectiveMealsForDay(jours, overrides, participants, j.date, "dejeuner");
    total += countEffectiveMealsForDay(jours, overrides, participants, j.date, "diner");
  }
  return total;
}
