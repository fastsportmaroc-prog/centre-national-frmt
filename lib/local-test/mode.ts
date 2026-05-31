import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { isSupabaseConfigured } from "@/lib/supabase/config";

let supabaseAuthActive = false;
let supabaseUnreachable = false;

/** Appelé par AuthProvider à la connexion / session initiale. */
export function setSupabaseAuthActive(active: boolean): void {
  supabaseAuthActive = active;
}

export function isSupabaseAuthActive(): boolean {
  return supabaseAuthActive;
}

/** Mis à jour après échec de requête Supabase (hors mode auth forcé). */
export function setSupabaseUnreachable(unreachable: boolean): void {
  supabaseUnreachable = unreachable;
}

export function isSupabaseUnreachable(): boolean {
  return supabaseUnreachable;
}

/**
 * Stockage localStorage — uniquement si Supabase indisponible ET utilisateur non authentifié.
 * Utilisateur authentifié → jamais localStorage.
 */
export function shouldUseLocalTestStorage(): boolean {
  if (typeof window === "undefined") return false;
  if (supabaseAuthActive) return false;
  if (!isSupabaseConfigured()) return true;
  if (createSupabaseBrowserClient() === null) return true;
  if (supabaseUnreachable) return true;
  return false;
}

/** @deprecated Utiliser shouldUseLocalTestStorage — conservé pour nettoyage UI */
export function hasLocalTestSessionData(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem("frmt-local-test:stages");
    if (!raw) return false;
    const parsed = JSON.parse(raw) as unknown[];
    return Array.isArray(parsed) && parsed.length > 0;
  } catch {
    return false;
  }
}

export function isLocalTestModeClient(): boolean {
  return shouldUseLocalTestStorage();
}

export function isBrowserSupabaseReady(): boolean {
  if (typeof window === "undefined") return isSupabaseConfigured();
  return isSupabaseConfigured() && createSupabaseBrowserClient() !== null;
}

/** Log si session auth active mais client browser absent (ne lève pas). */
export async function assertSupabaseWhenAuthenticated(): Promise<void> {
  if (!supabaseAuthActive) return;
  if (createSupabaseBrowserClient() === null) {
    console.warn(
      "[Supabase] Session authentifiée — client browser indisponible. Vérifiez .env.local."
    );
  }
}
