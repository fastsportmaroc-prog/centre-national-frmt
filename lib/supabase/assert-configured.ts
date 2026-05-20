import { isSupabaseConfigured } from "./config";

import { SUPABASE_ENV } from "./config";

const NOT_CONFIGURED = `Supabase non configuré. Vérifiez ${SUPABASE_ENV.URL} et ${SUPABASE_ENV.ANON_KEY} (Vercel → Environment Variables → Redeploy).`;

/** Production : les mocks sont désactivés — Supabase est obligatoire. */
export function assertSupabaseConfigured(): void {
  if (!isSupabaseConfigured()) {
    throw new Error(NOT_CONFIGURED);
  }
}
