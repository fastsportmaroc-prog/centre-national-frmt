import { getSupabaseDataClient } from "@/lib/supabase/data-client";
import { logHistorique } from "@/lib/audit/historique";
import { coachReferentLabel } from "@/lib/constants/entraineurs";
import type {
  DisponibiliteEntraineur,
  DisponibiliteEntraineurInput,
  Entraineur,
  EntraineurDepense,
  EntraineurDepenseInput,
  EntraineurInput,
  MissionEntraineur,
  MissionEntraineurInput,
} from "@/lib/types/entraineurs";

export async function getEntraineurs(): Promise<Entraineur[]> {
  const supabase = await getSupabaseDataClient();
  const { data, error } = await supabase.from("entraineurs").select("*").order("nom");
  if (error) throw new Error(error.message);
  return (data ?? []) as Entraineur[];
}

export async function getEntraineurById(id: string): Promise<Entraineur | null> {
  const supabase = await getSupabaseDataClient();
  const { data, error } = await supabase.from("entraineurs").select("*").eq("id", id).single();
  if (error) return null;
  return data as Entraineur;
}

export async function createEntraineur(input: EntraineurInput): Promise<Entraineur> {
  const supabase = await getSupabaseDataClient();
  const { data, error } = await supabase.from("entraineurs").insert(input).select().single();
  if (error) throw new Error(error.message);
  const item = data as Entraineur;
  await logHistorique({
    action: "creation",
    module: "entraineurs",
    entite_id: item.id,
    entite_label: `${item.prenom} ${item.nom}`,
    ancienne_valeur: null,
    nouvelle_valeur: item.statut,
    commentaire: null,
  });
  return item;
}

export async function updateEntraineur(
  id: string,
  input: Partial<EntraineurInput>
): Promise<Entraineur> {
  const supabase = await getSupabaseDataClient();
  const { data, error } = await supabase
    .from("entraineurs")
    .update(input)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Entraineur;
}

export async function deleteEntraineur(id: string): Promise<void> {
  const supabase = await getSupabaseDataClient();
  const { error } = await supabase.from("entraineurs").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export function entraineurCoachLabel(e: Entraineur): string {
  return coachReferentLabel(e.prenom, e.nom);
}

// ——— Missions ———

export async function getMissionsEntraineur(): Promise<MissionEntraineur[]> {
  const supabase = await getSupabaseDataClient();
  const { data, error } = await supabase
    .from("missions_entraineur")
    .select("*")
    .order("date_debut");
  if (error) throw new Error(error.message);
  return (data ?? []) as MissionEntraineur[];
}

export async function getMissionsByEntraineur(entraineurId: string): Promise<MissionEntraineur[]> {
  const all = await getMissionsEntraineur();
  return all.filter((m) => m.entraineur_id === entraineurId);
}

export async function createMissionEntraineur(
  input: MissionEntraineurInput
): Promise<MissionEntraineur> {
  const supabase = await getSupabaseDataClient();
  const { data, error } = await supabase
    .from("missions_entraineur")
    .insert(input)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as MissionEntraineur;
}

export async function updateMissionEntraineur(
  id: string,
  input: Partial<MissionEntraineurInput>
): Promise<MissionEntraineur> {
  const supabase = await getSupabaseDataClient();
  const { data, error } = await supabase
    .from("missions_entraineur")
    .update(input)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as MissionEntraineur;
}

// ——— Dépenses ———

export async function getDepensesEntraineur(): Promise<EntraineurDepense[]> {
  const supabase = await getSupabaseDataClient();
  const { data, error } = await supabase
    .from("entraineur_depenses")
    .select("*")
    .order("date_depense", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as EntraineurDepense[];
}

export async function getDepensesByEntraineur(entraineurId: string): Promise<EntraineurDepense[]> {
  const all = await getDepensesEntraineur();
  return all.filter((d) => d.entraineur_id === entraineurId);
}

export async function getTotalDepensesEntraineur(entraineurId: string): Promise<number> {
  const list = await getDepensesByEntraineur(entraineurId);
  return list.reduce((s, d) => s + d.montant, 0);
}

export async function createEntraineurDepense(
  input: EntraineurDepenseInput
): Promise<EntraineurDepense> {
  const supabase = await getSupabaseDataClient();
  const { data, error } = await supabase
    .from("entraineur_depenses")
    .insert(input)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as EntraineurDepense;
}

// ——— Disponibilités ———

export async function getDisponibilitesEntraineur(): Promise<DisponibiliteEntraineur[]> {
  const supabase = await getSupabaseDataClient();
  const { data, error } = await supabase.from("disponibilites_entraineur").select("*");
  if (error) throw new Error(error.message);
  return (data ?? []) as DisponibiliteEntraineur[];
}

export async function setDisponibiliteEntraineur(
  input: DisponibiliteEntraineurInput
): Promise<DisponibiliteEntraineur> {
  const supabase = await getSupabaseDataClient();
  const { data, error } = await supabase
    .from("disponibilites_entraineur")
    .upsert(input)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as DisponibiliteEntraineur;
}
