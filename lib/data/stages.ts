import { getSupabaseDataClient } from "@/lib/supabase/data-client";
import { logHistorique } from "@/lib/audit/historique";
import { loadStagesFromJson, rowToStageInput } from "@/lib/excel/cne-loader";
import type { StageProgramme, StageProgrammeInput } from "@/lib/types/stages";
import { enrichirStageDefaults } from "./stage-operations";

function normalizeStage(s: StageProgramme): StageProgramme {
  return {
    ...s,
    ...enrichirStageDefaults(s),
  } as StageProgramme;
}

export async function getStagesProgramme(): Promise<StageProgramme[]> {
  const supabase = await getSupabaseDataClient();
  const { data, error } = await supabase
    .from("stages_programme")
    .select("*")
    .order("date_debut", { ascending: true });
  if (error) throw new Error(error.message);
  return ((data ?? []) as StageProgramme[]).map(normalizeStage);
}

export async function getStageById(id: string): Promise<StageProgramme | null> {
  const supabase = await getSupabaseDataClient();
  const { data, error } = await supabase
    .from("stages_programme")
    .select("*")
    .eq("id", id)
    .single();
  if (error) return null;
  return normalizeStage(data as StageProgramme);
}

export async function createStageProgramme(
  input: StageProgrammeInput
): Promise<StageProgramme> {
  const payload = { ...input, ...enrichirStageDefaults(input) } as StageProgrammeInput;
  const supabase = await getSupabaseDataClient();
  const { data, error } = await supabase
    .from("stages_programme")
    .insert(payload)
    .select()
    .single();
  if (error) throw new Error(error.message);
  const item = normalizeStage(data as StageProgramme);

  await logHistorique({
    action: "creation",
    module: "stages",
    entite_id: item.id,
    entite_label: item.stage_action,
    ancienne_valeur: null,
    nouvelle_valeur: item.categorie,
    commentaire: item.source,
  });
  return item;
}

export async function updateStageProgramme(
  id: string,
  input: Partial<StageProgrammeInput>
): Promise<StageProgramme> {
  const supabase = await getSupabaseDataClient();
  const { data, error } = await supabase
    .from("stages_programme")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as StageProgramme;
}

export async function deleteStageProgramme(id: string): Promise<void> {
  const supabase = await getSupabaseDataClient();
  const { error } = await supabase.from("stages_programme").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function duplicateStageProgramme(id: string): Promise<StageProgramme> {
  const original = await getStageById(id);
  if (!original) throw new Error("Stage introuvable");
  const { id: _id, created_at, updated_at, id_excel, ...rest } = original;
  return createStageProgramme({
    ...rest,
    id_excel: id_excel ? `${id_excel}-copie` : null,
    stage_action: `${rest.stage_action} (copie)`,
  });
}

/** Réimporte les lignes JSON CNE (sans écraser les stages existants si ids différents) */
export async function importStagesFromCneJson(): Promise<number> {
  const rows = loadStagesFromJson();
  let count = 0;
  for (const row of rows) {
    await createStageProgramme(rowToStageInput(row));
    count++;
  }
  return count;
}

export async function getStagesProchains(limit = 5): Promise<StageProgramme[]> {
  const today = new Date().toISOString().split("T")[0]!;
  const all = await getStagesProgramme();
  return all.filter((s) => s.date_fin >= today).slice(0, limit);
}
