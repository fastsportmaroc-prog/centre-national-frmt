import { getSafeSupabaseClient } from "@/lib/supabase/client";
import { supabaseDataOrFallback } from "@/lib/supabase/read-fallback";
import type {
  KinesitherapieSeanceV2,
  KinesitherapieStageParticipantV2,
  KinesitherapieStageV2,
} from "@/lib/types/v2";

function client() {
  return getSafeSupabaseClient();
}

export async function getKinesitherapieSeances(): Promise<KinesitherapieSeanceV2[]> {
  const c = client();
  if (!c) return [];
  const { data, error } = await c
    .from("kinesitherapie_seances")
    .select("*")
    .order("date_seance", { ascending: false });
  return supabaseDataOrFallback((data ?? []) as KinesitherapieSeanceV2[], error, "kine seances", []);
}

export async function getKinesitherapieSeancesForJoueurs(
  joueurIds: string[],
  dateDebut?: string,
  dateFin?: string
): Promise<KinesitherapieSeanceV2[]> {
  if (joueurIds.length === 0) return [];
  const c = client();
  if (!c) return [];
  let q = c.from("kinesitherapie_seances").select("*").in("joueur_id", joueurIds);
  if (dateDebut) q = q.gte("date_seance", dateDebut);
  if (dateFin) q = q.lte("date_seance", dateFin);
  const { data, error } = await q.order("date_seance", { ascending: false });
  return supabaseDataOrFallback((data ?? []) as KinesitherapieSeanceV2[], error, "kine seances filter", []);
}

export async function createKinesitherapieSeance(
  input: Omit<KinesitherapieSeanceV2, "id" | "created_at">
): Promise<{ data: KinesitherapieSeanceV2 | null; error?: string }> {
  const c = client();
  if (!c) return { data: null, error: "Supabase indisponible" };
  const { data, error } = await c.from("kinesitherapie_seances").insert(input).select().single();
  if (error) return { data: null, error: error.message };
  return { data: data as KinesitherapieSeanceV2 };
}

export async function deleteKinesitherapieSeance(id: string): Promise<{ ok: boolean; error?: string }> {
  const c = client();
  if (!c) return { ok: false, error: "Supabase indisponible" };
  const { error } = await c.from("kinesitherapie_seances").delete().eq("id", id);
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function getKinesitherapieByStage(
  stage_id: string
): Promise<KinesitherapieStageV2 | null> {
  const c = client();
  if (!c) return null;
  const { data, error } = await c
    .from("kinesitherapie_stages")
    .select("*")
    .eq("stage_id", stage_id)
    .maybeSingle();
  if (error) return null;
  return (data as KinesitherapieStageV2) ?? null;
}

export async function getKinesitherapieStageParticipants(
  stage_id: string
): Promise<KinesitherapieStageParticipantV2[]> {
  const c = client();
  if (!c) return [];
  const { data, error } = await c
    .from("kinesitherapie_stage_participants")
    .select("*")
    .eq("stage_id", stage_id);
  return supabaseDataOrFallback(
    (data ?? []) as KinesitherapieStageParticipantV2[],
    error,
    "kine stage participants",
    []
  );
}

export async function upsertKinesitherapieStage(
  payload: Omit<KinesitherapieStageV2, "id" | "created_at"> & { id?: string }
): Promise<{ data: KinesitherapieStageV2 | null; error?: string }> {
  const c = client();
  if (!c) return { data: null, error: "Supabase indisponible" };
  const { data, error } = await c
    .from("kinesitherapie_stages")
    .upsert(payload, { onConflict: "stage_id" })
    .select()
    .single();
  if (error) return { data: null, error: error.message };
  return { data: data as KinesitherapieStageV2 };
}

export async function replaceKinesitherapieStageParticipants(
  stage_id: string,
  rows: { personne_id: string; personne_type: "joueur" | "entraineur"; auto_from_seance: boolean }[]
): Promise<{ ok: boolean; error?: string }> {
  const c = client();
  if (!c) return { ok: false, error: "Supabase indisponible" };
  const { error: delErr } = await c
    .from("kinesitherapie_stage_participants")
    .delete()
    .eq("stage_id", stage_id);
  if (delErr) return { ok: false, error: delErr.message };
  if (rows.length === 0) return { ok: true };
  const { error } = await c.from("kinesitherapie_stage_participants").insert(
    rows.map((r) => ({ stage_id, ...r }))
  );
  return error ? { ok: false, error: error.message } : { ok: true };
}

/** Joueurs du stage ayant au moins une séance kiné sur la période. */
export function joueurIdsFromSeancesOnPeriod(
  seances: KinesitherapieSeanceV2[],
  joueurIds: string[],
  dateDebut: string,
  dateFin: string
): string[] {
  const set = new Set<string>();
  for (const s of seances) {
    if (!joueurIds.includes(s.joueur_id)) continue;
    if (s.date_seance >= dateDebut && s.date_seance <= dateFin) set.add(s.joueur_id);
  }
  return [...set];
}
