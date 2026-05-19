import { isSupabaseConfigured } from "./config";

const NOT_CONFIGURED =
  "Supabase non configuré. Vérifiez NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY dans .env.local.";

/** Production : les mocks sont désactivés — Supabase est obligatoire. */
export function assertSupabaseConfigured(): void {
  if (!isSupabaseConfigured()) {
    throw new Error(NOT_CONFIGURED);
  }
}
