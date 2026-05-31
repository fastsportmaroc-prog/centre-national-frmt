import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "./browser";

export { isSupabaseConfigured, getSupabasePublicEnv } from "./config";
export { assertSupabaseConfigured } from "./assert-configured";
export { createSupabaseBrowserClient } from "./browser";

/** @deprecated Préférer getSafeSupabaseClient() pour V2 */
export function getSupabaseBrowserClient(): SupabaseClient {
  const client = createSupabaseBrowserClient();
  if (!client) {
    throw new Error(
      "Supabase non configure. Verifiez .env.local (NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY eyJ...)."
    );
  }
  return client;
}

/** Client Supabase sans exception — V2 */
export function getSafeSupabaseClient(): SupabaseClient | null {
  return createSupabaseBrowserClient();
}

export function isLocalFallbackMode(): boolean {
  return getSafeSupabaseClient() === null;
}
