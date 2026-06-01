import { resetSupabaseBrowserClient, createSupabaseBrowserClient } from "@/lib/supabase/browser";

function shouldRemoveStorageKey(key: string): boolean {
  const k = key.toLowerCase();
  return (
    k.startsWith("sb-") ||
    k.includes("supabase") ||
    k.includes("auth-token") ||
    k.includes("refresh_token")
  );
}

/** Supprime les tokens Supabase du navigateur (localStorage + sessionStorage). */
export function clearSupabaseBrowserStorage(): void {
  if (typeof window === "undefined") return;

  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && shouldRemoveStorageKey(key)) localStorage.removeItem(key);
    }
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const key = sessionStorage.key(i);
      if (key && shouldRemoveStorageKey(key)) sessionStorage.removeItem(key);
    }
  } catch {
    /* ignore quota / private mode */
  }

  try {
    const client = createSupabaseBrowserClient();
    if (client) void client.auth.signOut({ scope: "local" });
  } catch {
    /* ignore */
  }

  resetSupabaseBrowserClient();
}
