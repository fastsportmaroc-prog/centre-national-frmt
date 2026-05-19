import { getSupabaseDataClient } from "@/lib/supabase/data-client";
import type { Hebergement, HebergementInput } from "@/lib/types/database";
import { normalizeHebergementInput } from "@/lib/utils/hebergement";

export async function getHebergements(): Promise<Hebergement[]> {
  const supabase = await getSupabaseDataClient();
  const { data, error } = await supabase
    .from("hebergements")
    .select("*")
    .order("pavillon", { ascending: true })
    .order("numero_chambre", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Hebergement[];
}

export async function createHebergement(input: HebergementInput): Promise<Hebergement> {
  const payload = normalizeHebergementInput(input);
  const supabase = await getSupabaseDataClient();
  const { data, error } = await supabase
    .from("hebergements")
    .insert(payload)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Hebergement;
}

export async function getHebergementById(id: string): Promise<Hebergement | null> {
  const all = await getHebergements();
  return all.find((h) => h.id === id) ?? null;
}

export async function updateHebergement(
  id: string,
  input: Partial<HebergementInput>
): Promise<Hebergement> {
  const existing = await getHebergementById(id);
  if (!existing) throw new Error("Chambre introuvable");
  const merged = normalizeHebergementInput({ ...existing, ...input });

  const supabase = await getSupabaseDataClient();
  const { data, error } = await supabase
    .from("hebergements")
    .update(merged)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Hebergement;
}

export async function deleteHebergement(id: string): Promise<void> {
  const supabase = await getSupabaseDataClient();
  const { error } = await supabase.from("hebergements").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
