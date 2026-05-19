import type { SupabaseClient } from "@supabase/supabase-js";
import { assertSupabaseConfigured } from "./assert-configured";
import { createSupabaseBrowserClient } from "./browser";

export { assertSupabaseConfigured };

/**
 * Client Supabase pour lib/data appelé depuis les Client Components.
 * N'importe jamais lib/supabase/server.ts ici.
 */
export async function getSupabaseDataClient(): Promise<SupabaseClient> {
  assertSupabaseConfigured();
  const browser = createSupabaseBrowserClient();
  if (!browser) throw new Error("Client navigateur Supabase indisponible.");
  return browser;
}
