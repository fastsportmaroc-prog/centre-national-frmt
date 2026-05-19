import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "./browser";
import { isSupabaseConfigured } from "./config";
import { createSupabaseServerClient } from "./server";

const NOT_CONFIGURED =
  "Supabase non configuré. Vérifiez NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY dans .env.local.";

/** Production : les mocks sont désactivés — Supabase est obligatoire. */
export function assertSupabaseConfigured(): void {
  if (!isSupabaseConfigured()) {
    throw new Error(NOT_CONFIGURED);
  }
}

/**
 * Client Supabase pour les opérations data (navigateur ou serveur avec session cookies).
 */
export async function getSupabaseDataClient(): Promise<SupabaseClient> {
  assertSupabaseConfigured();

  if (typeof window === "undefined") {
    const server = await createSupabaseServerClient();
    if (!server) throw new Error("Client serveur Supabase indisponible.");
    return server;
  }

  const browser = createSupabaseBrowserClient();
  if (!browser) throw new Error("Client navigateur Supabase indisponible.");
  return browser;
}
