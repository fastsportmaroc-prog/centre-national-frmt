import {
  assertSupabaseWhenAuthenticated,
  isSupabaseAuthActive,
  shouldUseLocalTestStorage,
} from "@/lib/local-test/mode";
import { isSupabaseDataClientReady } from "./data-client";

/** Avant une écriture : log si auth active mais client absent (pas de throw). */
export async function guardWriteAccess(): Promise<void> {
  if (shouldUseLocalTestStorage()) return;
  await assertSupabaseWhenAuthenticated();
  if (!(await isSupabaseDataClientReady()) && isSupabaseAuthActive()) {
    console.warn("[Supabase] Écriture demandée — client indisponible (session authentifiée).");
  }
}

/** Avant une lecture Supabase : log si auth active mais client absent (pas de throw). */
export async function guardReadAccess(): Promise<void> {
  if (shouldUseLocalTestStorage()) return;
  if (isSupabaseAuthActive() && !(await isSupabaseDataClientReady())) {
    console.warn("[Supabase] Lecture demandée — client indisponible (session authentifiée).");
  }
}

export function authBlocksLocalFallback(): boolean {
  return isSupabaseAuthActive() && !shouldUseLocalTestStorage();
}
