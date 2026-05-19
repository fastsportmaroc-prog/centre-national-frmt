import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { assertSupabaseConfigured } from "./assert-configured";
import { createSupabaseServerClient } from "./server";

/** Client Supabase serveur — routes API, Server Components, Server Actions uniquement. */
export async function getSupabaseServerDataClient(): Promise<SupabaseClient> {
  assertSupabaseConfigured();
  const server = await createSupabaseServerClient();
  if (!server) throw new Error("Client serveur Supabase indisponible.");
  return server;
}
