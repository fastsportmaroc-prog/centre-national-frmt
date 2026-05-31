import { softDeleteRecord } from "@/lib/data/soft-delete";
import { getSupabaseDataClient } from "@/lib/supabase/data-client";
import type { Groupe, GroupeInput } from "@/lib/types/database";

export async function getGroupes(): Promise<Groupe[]> {
  const supabase = await getSupabaseDataClient();
  const { data, error } = await supabase
    .from("groupes")
    .select("*")
    .is("deleted_at", null)
    .order("nom");
  if (error) {
    const fallback = await supabase.from("groupes").select("*").order("nom");
    if (fallback.error) {
      console.warn("[Supabase] groupes:", fallback.error.message);
      return [];
    }
    return ((fallback.data ?? []) as (Groupe & { deleted_at?: string | null })[]).filter(
      (g) => !g.deleted_at
    );
  }
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

export async function deleteGroupe(id: string, reason?: string): Promise<void> {
  const supabase = await getSupabaseDataClient();
  const { data: existing } = await supabase.from("groupes").select("*").eq("id", id).single();
  if (!existing) return;
  await softDeleteRecord({
    table: "groupes",
    id,
    entityType: "groupe",
    entityLabel: (existing as Groupe).nom,
    module: "groupes",
    reason,
    beforeSnapshot: existing as Record<string, unknown>,
  });
}

export async function countJoueursInGroupe(groupeId: string): Promise<number> {
  const supabase = await getSupabaseDataClient();
  const { count, error } = await supabase
    .from("joueurs")
    .select("*", { count: "exact", head: true })
    .eq("groupe_id", groupeId);
  if (error) {
    console.warn("[Supabase] count joueurs groupe:", error.message);
    return 0;
  }
  return count ?? 0;
}
