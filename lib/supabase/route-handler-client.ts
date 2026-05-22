import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import type { CookieToSet } from "@/lib/supabase/cookies";
import { getSupabasePublicEnv, isSupabaseConfigured } from "@/lib/supabase/config";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function createSupabaseRouteHandlerClient(
  response: NextResponse
): Promise<SupabaseClient | null> {
  if (!isSupabaseConfigured()) return null;

  const { url, anonKey } = getSupabasePublicEnv();
  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        cookiesToSet.forEach(({ name, value, options }) => {
          try {
            cookieStore.set(name, value, options);
          } catch {
            /* ignore */
          }
          response.cookies.set(name, value, options);
        });
      },
    },
  });
}
