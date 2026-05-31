import type { PostgrestError } from "@supabase/supabase-js";

/** Log erreur Supabase et retourne fallback (lecture silencieuse). */
export function supabaseReadFallback<T>(error: PostgrestError | null, context: string, fallback: T): T {
  if (error) {
    console.warn(`[Supabase] ${context}:`, error.message);
    return fallback;
  }
  return fallback;
}

export function supabaseDataOrFallback<T>(
  data: T | null,
  error: PostgrestError | null,
  context: string,
  fallback: T
): T {
  if (error) {
    console.warn(`[Supabase] ${context}:`, error.message);
    return fallback;
  }
  return (data ?? fallback) as T;
}
