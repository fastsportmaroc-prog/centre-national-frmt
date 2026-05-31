import { logHistorique } from "@/lib/audit/historique";
import { getSupabaseDataClient, isSupabaseDataClientReady } from "@/lib/supabase/data-client";
import { shouldUseLocalTestStorage } from "@/lib/local-test/mode";
import { supabaseDataOrFallback } from "@/lib/supabase/read-fallback";
import { localGetMateriels } from "@/lib/local-test/data-access";
import type {
  Materiel,
  MaterielInput,
  MouvementMateriel,
  MouvementMaterielInput,
} from "@/lib/types/materiel";

export async function getMateriels(): Promise<Materiel[]> {
  if (shouldUseLocalTestStorage()) return localGetMateriels();
  if (!(await isSupabaseDataClientReady())) return [];
  const supabase = await getSupabaseDataClient();
  const { data, error } = await supabase.from("materiels").select("*").order("nom");
  return supabaseDataOrFallback((data ?? []) as Materiel[], error, "materiels select", []);
}

export async function getMouvementsMateriel(): Promise<MouvementMateriel[]> {
  if (!(await isSupabaseDataClientReady())) return [];
  const supabase = await getSupabaseDataClient();
  const { data, error } = await supabase
    .from("mouvements_materiel")
    .select("*")
    .order("created_at", { ascending: false });
  return supabaseDataOrFallback(
    (data ?? []) as MouvementMateriel[],
    error,
    "mouvements_materiel select",
    []
  );
}

export async function createMateriel(input: MaterielInput): Promise<Materiel> {
  const supabase = await getSupabaseDataClient();
  const { data, error } = await supabase.from("materiels").insert(input).select().single();
  if (error) throw new Error(error.message);
  const item = data as Materiel;
  await logHistorique({
    action: "creation",
    module: "materiel",
    entite_id: item.id,
    entite_label: item.nom,
    ancienne_valeur: null,
    nouvelle_valeur: `${item.quantite_totale}`,
    commentaire: null,
  });
  return item;
}

export async function updateMateriel(id: string, input: Partial<MaterielInput>): Promise<Materiel> {
  const supabase = await getSupabaseDataClient();
  const { data, error } = await supabase
    .from("materiels")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  const item = data as Materiel;
  await logHistorique({
    action: "modification",
    module: "materiel",
    entite_id: id,
    entite_label: item.nom,
    ancienne_valeur: null,
    nouvelle_valeur: `${item.quantite_disponible}`,
    commentaire: null,
  });
  return item;
}

export async function createMouvementMateriel(
  input: MouvementMaterielInput
): Promise<MouvementMateriel> {
  const supabase = await getSupabaseDataClient();
  const { data, error } = await supabase
    .from("mouvements_materiel")
    .insert(input)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as MouvementMateriel;
}
