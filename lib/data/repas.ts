import { getSupabaseDataClient } from "@/lib/supabase/data-client";
import { shouldUseLocalTestStorage } from "@/lib/local-test/mode";
import { localGetRepas } from "@/lib/local-test/data-access";
import type { Repas } from "@/lib/types/database";

export async function getRepas(): Promise<Repas[]> {
  if (shouldUseLocalTestStorage()) {
    return localGetRepas();
  }

  const supabase = await getSupabaseDataClient();
  if (!supabase) {
    return localGetRepas();
  }

  const { data, error } = await supabase
    .from("repas")
    .select("*")
    .order("date_repas", { ascending: false });

  if (error) {
    console.warn("Erreur Supabase repas — fallback localStorage:", error.message);
    return localGetRepas();
  }

  return (data ?? []) as Repas[];
}
