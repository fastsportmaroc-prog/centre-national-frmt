import { getSupabaseDataClient, isSupabaseDataClientReady } from "@/lib/supabase/data-client";

import { guardReadAccess, guardWriteAccess } from "@/lib/supabase/data-access-guard";

import { logHistorique } from "@/lib/audit/historique";

import { isSupabaseAuthActive, shouldUseLocalTestStorage } from "@/lib/local-test/mode";

import {

  localCreateStageProgramme,

  localDeleteStageProgramme,

  localGetStageById,

  localGetStagesProgramme,

  localUpdateStageProgramme,

} from "@/lib/local-test/stages-store";

import { loadStagesFromJson, rowToStageInput } from "@/lib/excel/cne-loader";

import { supabaseDataOrFallback } from "@/lib/supabase/read-fallback";

import { deleteStageRelations } from "@/lib/data/stage-relations";

import { deleteStageServices } from "@/lib/data/stage-services";

import type { StageProgramme, StageProgrammeInput } from "@/lib/types/stages";

import { enrichirStageDefaults } from "./stage-operations";



/** Table utilisée par l'app — schéma complet CNE (pas la table simplifiée `stages`). */

export const STAGES_TABLE = "stages_programme";



function normalizeStage(s: StageProgramme): StageProgramme {

  return {

    ...s,

    ...enrichirStageDefaults(s),

  } as StageProgramme;

}



export async function getStagesProgramme(): Promise<StageProgramme[]> {

  if (shouldUseLocalTestStorage()) return localGetStagesProgramme();

  await guardReadAccess();

  if (!(await isSupabaseDataClientReady())) return [];



  const supabase = await getSupabaseDataClient();

  const { data, error } = await supabase

    .from(STAGES_TABLE)

    .select("*")

    .order("date_debut", { ascending: true });



  return supabaseDataOrFallback(

    data ? (data as StageProgramme[]).map(normalizeStage) : [],

    error,

    `${STAGES_TABLE} select`,

    []

  );

}



export async function getStageById(id: string): Promise<StageProgramme | null> {

  if (shouldUseLocalTestStorage()) return localGetStageById(id);

  await guardReadAccess();

  if (!(await isSupabaseDataClientReady())) return null;



  const supabase = await getSupabaseDataClient();

  const { data, error } = await supabase.from(STAGES_TABLE).select("*").eq("id", id).single();

  if (error) {

    console.warn(`[Supabase] ${STAGES_TABLE} by id:`, error.message);

    return null;

  }

  return normalizeStage(data as StageProgramme);

}



export async function createStageProgramme(

  input: StageProgrammeInput

): Promise<StageProgramme> {

  const payload = { ...input, ...enrichirStageDefaults(input) } as StageProgrammeInput;



  if (shouldUseLocalTestStorage()) {

    const item = localCreateStageProgramme(payload);

    await logHistorique({

      action: "creation",

      module: "stages",

      entite_id: item.id,

      entite_label: item.stage_action,

      ancienne_valeur: null,

      nouvelle_valeur: item.categorie,

      commentaire: "Mode local test",

    });

    return item;

  }



  await guardWriteAccess();

  if (!(await isSupabaseDataClientReady())) {
    console.warn("[Supabase] indisponible — création stage en localStorage");
    const item = localCreateStageProgramme(payload);
    await logHistorique({
      action: "creation",
      module: "stages",
      entite_id: item.id,
      entite_label: item.stage_action,
      ancienne_valeur: null,
      nouvelle_valeur: item.categorie,
      commentaire: "Fallback local (Supabase offline)",
    });
    return item;
  }

  const supabase = await getSupabaseDataClient();
  const { data, error } = await supabase.from(STAGES_TABLE).insert(payload).select().single();
  if (error) {
    console.warn(`[Supabase] ${STAGES_TABLE} insert:`, error.message);
    if (isSupabaseAuthActive()) {
      console.warn("[Supabase] Échec insert stage (session auth) — vérifiez RLS stages_programme.");
    }
    const item = localCreateStageProgramme(payload);
    await logHistorique({
      action: "creation",
      module: "stages",
      entite_id: item.id,
      entite_label: item.stage_action,
      ancienne_valeur: null,
      nouvelle_valeur: item.categorie,
      commentaire: isSupabaseAuthActive()
        ? `Fallback local (insert Supabase: ${error.message})`
        : "Fallback local (Supabase offline)",
    });
    return item;
  }
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

  if (shouldUseLocalTestStorage()) return localUpdateStageProgramme(id, input);

  await guardWriteAccess();
  if (!(await isSupabaseDataClientReady())) {
    console.warn("[Supabase] indisponible — mise à jour stage locale");
    return localUpdateStageProgramme(id, input);
  }

  const supabase = await getSupabaseDataClient();
  const { data, error } = await supabase
    .from(STAGES_TABLE)
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) {
    console.warn(`[Supabase] ${STAGES_TABLE} update:`, error.message);
    return localUpdateStageProgramme(id, input);
  }
  return data as StageProgramme;

}



export async function deleteStageProgramme(id: string): Promise<void> {

  const stage = await getStageById(id);



  if (shouldUseLocalTestStorage()) {

    localDeleteStageProgramme(id);

    await deleteStageRelations(id);

    await deleteStageServices(id);

    return;

  }



  await guardWriteAccess();

  const supabase = await getSupabaseDataClient();



  await supabase.from("reservations_infrastructure").delete().eq("stage_id", id);

  await deleteStageServices(id);

  await deleteStageRelations(id);



  const { error } = await supabase.from(STAGES_TABLE).delete().eq("id", id);

  if (error) {
    console.warn(`[Supabase] ${STAGES_TABLE} delete:`, error.message);
    return;
  }



  if (stage) {

    await logHistorique({

      action: "suppression",

      module: "stages",

      entite_id: id,

      entite_label: stage.stage_action,

      ancienne_valeur: stage.categorie,

      nouvelle_valeur: null,

      commentaire: "Suppression cascade (relations, services, réservations)",

    });

  }

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


