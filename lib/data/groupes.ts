import { getSupabaseDataClient } from "@/lib/supabase/data-client";
import type { Groupe, GroupeInput } from "@/lib/types/database";

export async function getGroupes(): Promise<Groupe[]> {
  const supabase = await getSupabaseDataClient();
  const { data, error } = await supabase.from("groupes").select("*").order("nom");
  if (error) throw new Error(error.message);
  return (data ?? []) as Groupe[];
}

export async function createGroupe(input: GroupeInput): Promise<Groupe> {
  const supabase = await getSupabaseDataClient();
  const { data, error } = await supabase.from("groupes").insert(input).select().single();
  if (error) throw new Error(error.message);
  return data as Groupe;
}

export async function updateGroupe(
  id: string,
  input: Partial<GroupeInput>
): Promise<Groupe> {
  const supabase = await getSupabaseDataClient();
  const { data, error } = await supabase
    .from("groupes")
    .update(input)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Groupe;
}

export async function deleteGroupe(id: string): Promise<void> {
  const supabase = await getSupabaseDataClient();
  const { error } = await supabase.from("groupes").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function countJoueursInGroupe(groupeId: string): Promise<number> {
  const supabase = await getSupabaseDataClient();
  const { count, error } = await supabase
    .from("joueurs")
    .select("*", { count: "exact", head: true })
    .eq("groupe_id", groupeId);
  if (error) throw new Error(error.message);
  return count ?? 0;
}
