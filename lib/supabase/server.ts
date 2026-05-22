import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { CookieToSet } from "./cookies";
import { getSupabasePublicEnv } from "./config";
import { readSupabaseEnvFromFile } from "./env-file";

function getServerSupabaseEnv() {
  const proc = getSupabasePublicEnv();
  const file = readSupabaseEnvFromFile();
  return {
    url: proc.url || file.url,
    anonKey:
      proc.anonKey.startsWith("eyJ") || proc.anonKey.startsWith("sb_publishable_")
        ? proc.anonKey
        : file.anonKey || proc.anonKey,
  };
}

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
