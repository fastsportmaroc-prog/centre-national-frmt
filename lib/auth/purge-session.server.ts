import "server-only";

import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function isSupabaseAuthCookie(name: string): boolean {
  return name.startsWith("sb-") || name.toLowerCase().includes("supabase");
}

/** Déconnexion serveur + suppression cookies auth Supabase. */
export async function purgeSupabaseAuthServer(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  if (supabase) {
    try {
      await supabase.auth.signOut();
    } catch {
      /* session déjà invalide */
    }
  }

  const cookieStore = await cookies();
  for (const c of cookieStore.getAll()) {
    if (isSupabaseAuthCookie(c.name)) {
      cookieStore.delete(c.name);
    }
  }
}
