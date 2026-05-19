import { logHistorique } from "@/lib/audit/historique";
import { getSupabaseDataClient } from "@/lib/supabase/data-client";
import type {
  Materiel,
  MaterielInput,
  MouvementMateriel,
  MouvementMaterielInput,
} from "@/lib/types/materiel";

export async function getMateriels(): Promise<Materiel[]> {
  const supabase = await getSupabaseDataClient();
  const { data, error } = await supabase.from("materiels").select("*").order("nom");
  if (error) throw new Error(error.message);
  return (data ?? []) as Materiel[];
}

export async function getMouvementsMateriel(): Promise<MouvementMateriel[]> {
  const supabase = await getSupabaseDataClient();
  const { data, error } = await supabase
    .from("mouvements_materiel")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as MouvementMateriel[];
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
