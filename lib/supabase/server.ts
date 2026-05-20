import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { CookieToSet } from "./cookies";
import { getSupabaseEnv, isSupabaseConfigured } from "./config";

export async function createSupabaseServerClient() {
  if (!isSupabaseConfigured()) return null;

  const cookieStore = await cookies();
  const { url, anonKey } = getSupabaseEnv();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Ignoré en Server Component statique
        }
      },
    },
  });
}
