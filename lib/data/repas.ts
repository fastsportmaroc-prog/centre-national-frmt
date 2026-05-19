import { getSupabaseDataClient } from "@/lib/supabase/data-client";
import type { Repas } from "@/lib/types/database";

export async function getRepas(): Promise<Repas[]> {
  const supabase = await getSupabaseDataClient();
  const { data, error } = await supabase
    .from("repas")
    .select("*")
    .order("date_repas", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Repas[];
}
