import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseDataClient } from "./data-client";

type SupabaseError = { message: string } | null;

/**
 * Exécute une requête Supabase avec fallback — ne lève jamais si client absent.
 */
export async function supabaseQuery<T>(
  fn: (client: SupabaseClient) => PromiseLike<{ data: T | null; error: SupabaseError }>,
  fallback: T
): Promise<T> {
  const client = await getSupabaseDataClient();
  if (!client) return fallback;
  try {
    const { data, error } = await fn(client);
    if (error) {
      console.warn("[Supabase]", error.message);
      return fallback;
    }
    return (data ?? fallback) as T;
  } catch (e) {
    console.warn("[Supabase]", e instanceof Error ? e.message : String(e));
    return fallback;
  }
}

/** Retourne le client ou null — pour mutations avec fallback manuel. */
export async function getSupabaseClientOrNull(): Promise<SupabaseClient | null> {
  return getSupabaseDataClient();
}
