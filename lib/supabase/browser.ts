import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabasePublicEnv, isSupabaseConfigured } from "./config";

let browserClient: SupabaseClient | null = null;

export function createSupabaseBrowserClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  const { url, anonKey } = getSupabasePublicEnv();
  if (!url || !anonKey) return null;
  if (!browserClient) {
    browserClient = createBrowserClient(url, anonKey);
  }
  return browserClient;
}

export function resetSupabaseBrowserClient(): void {
  browserClient = null;
}

/** Compat modules stockage / parametres (sync, pas d'hydratation API). */
export async function createSupabaseBrowserClientAsync(): Promise<SupabaseClient | null> {
  return createSupabaseBrowserClient();
}
