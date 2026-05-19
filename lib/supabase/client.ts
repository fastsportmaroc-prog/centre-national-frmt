import { getSupabaseDataClient } from "./data-client";

export { isSupabaseConfigured } from "./config";
export { assertSupabaseConfigured } from "./data-client";
export { createSupabaseBrowserClient } from "./browser";
export { getSupabaseDataClient } from "./data-client";

/** @deprecated Utiliser getSupabaseDataClient() — toujours Supabase en production. */
export async function createSupabaseClient() {
  return getSupabaseDataClient();
}
