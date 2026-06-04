import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@/lib/supabase/admin.server";
import { getSupabaseServerDataClient } from "@/lib/supabase/data-client.server";

/** Préfère service_role pour résolution infra + réservations (évite RLS bloquants). */
export async function getSupabaseForTerrainSync(): Promise<SupabaseClient> {
  const admin = createSupabaseAdminClient();
  if (admin) return admin;
  return getSupabaseServerDataClient();
}
