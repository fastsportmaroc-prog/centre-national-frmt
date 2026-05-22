import "server-only";

import { createClient } from "@supabase/supabase-js";
import { getSupabasePublicEnv } from "@/lib/supabase/config";

/** Client admin — UNIQUEMENT serveur, jamais exposer au navigateur. */
export function createSupabaseAdminClient() {
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE?.trim();

  if (!serviceKey) return null;

  const { url } = getSupabasePublicEnv();
  if (!url) return null;

  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
