import { createBrowserClient } from "@supabase/ssr";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createSupabaseBrowserClient } from "./browser";



let warnedUnavailable = false;

let placeholderClient: SupabaseClient | null = null;



function warnSupabaseUnavailable(): void {

  if (warnedUnavailable) return;

  warnedUnavailable = true;

  console.warn("[Supabase] indisponible — fallback localStorage");

}



function getPlaceholderSupabaseClient(): SupabaseClient {

  if (!placeholderClient) {

    placeholderClient = createBrowserClient(

      "https://placeholder.supabase.co",

      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder"

    );

  }

  return placeholderClient;

}



/**

 * Client Supabase pour appels depuis Client Components (lib/data).

 * Ne lève jamais d'exception : retourne un client placeholder si indisponible.

 * Utiliser `isSupabaseDataClientReady()` avant les écritures ou préférer shouldUseLocalTestStorage().

 */

export async function getSupabaseDataClient(): Promise<SupabaseClient> {

  const client = createSupabaseBrowserClient();

  if (!client) {

    warnSupabaseUnavailable();

    return getPlaceholderSupabaseClient();

  }

  return client;

}



/** Indique si le client réel Supabase est disponible (pas le placeholder). */

export async function isSupabaseDataClientReady(): Promise<boolean> {

  return createSupabaseBrowserClient() !== null;

}

