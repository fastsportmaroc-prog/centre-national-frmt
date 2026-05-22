import { isSupabaseConfigured } from "./config";

import { SUPABASE_ENV } from "./config";

export const SUPABASE_NOT_CONFIGURED_MESSAGE = `Supabase non configuré. Vérifiez ${SUPABASE_ENV.URL} et ${SUPABASE_ENV.ANON_KEY} dans .env.local puis redémarrez npm run dev.`;

const NOT_CONFIGURED = SUPABASE_NOT_CONFIGURED_MESSAGE;

/** Production : les mocks sont désactivés — Supabase est obligatoire. */
export function assertSupabaseConfigured(): void {
  if (!isSupabaseConfigured()) {
    throw new Error(NOT_CONFIGURED);
  }
}
