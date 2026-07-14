import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { CookieToSet } from "./cookies";
import { getServerSupabaseEnv } from "./server-env";

export async function createSupabaseServerClient() {
  const { url, anonKey } = getServerSupabaseEnv();
  if (!url || !anonKey || anonKey.length < 20) return null;

  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      },
    },
  });
}
