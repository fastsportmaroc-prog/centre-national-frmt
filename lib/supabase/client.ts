import type { SupabaseClient } from "@supabase/supabase-js";
import { assertSupabaseConfigured } from "./assert-configured";
import { createSupabaseBrowserClient } from "./browser";

export { isSupabaseConfigured } from "./config";
export { assertSupabaseConfigured } from "./assert-configured";
export { createSupabaseBrowserClient } from "./browser";

/**
 * Client Supabase navigateur — safe pour les Client Components ("use client").
 * Ne pas importer lib/supabase/server.ts depuis les composants client.
 */
export function getSupabaseBrowserClient(): SupabaseClient {
  assertSupabaseConfigured();
  const client = createSupabaseBrowserClient();
  if (!client) throw new Error("Client navigateur Supabase indisponible.");
  return client;
}

/** @deprecated Préférer getSupabaseBrowserClient() côté client ou getSupabaseDataClient() côté data layer. */
export async function createSupabaseClient(): Promise<SupabaseClient> {
  return getSupabaseBrowserClient();
}
