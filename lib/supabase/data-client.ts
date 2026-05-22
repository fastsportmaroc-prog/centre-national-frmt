import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "./browser";

/** Client Supabase pour appels depuis Client Components (lib/data). */
export async function getSupabaseDataClient(): Promise<SupabaseClient> {
  const client = createSupabaseBrowserClient();
  if (!client) {
    throw new Error("Supabase indisponible — verifiez .env.local puis redemarrez le serveur");
  }
  return client;
}
