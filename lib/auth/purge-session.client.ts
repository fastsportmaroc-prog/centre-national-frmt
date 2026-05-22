"use client";

import { clearSupabaseBrowserStorage } from "@/lib/auth/clear-client-storage";

let purging = false;

/**
 * Nettoie storage + cookies serveur, puis redirige vers login si besoin.
 * Idempotent (évite les boucles).
 */
export async function purgeInvalidSession(options?: {
  redirect?: boolean;
  reason?: string;
}): Promise<void> {
  if (purging) return;
  purging = true;

  const redirect = options?.redirect ?? true;
  const reason = options?.reason ?? "session_expired";

  try {
    clearSupabaseBrowserStorage();
    await fetch("/api/auth/clear", {
      method: "POST",
      credentials: "include",
      cache: "no-store",
    });
  } catch {
    /* réseau coupé */
  } finally {
    purging = false;
  }

  if (!redirect || typeof window === "undefined") return;

  const path = window.location.pathname;
  if (path.startsWith("/auth/login")) return;

  const url = new URL("/auth/login", window.location.origin);
  url.searchParams.set("reason", reason);
  window.location.replace(url.toString());
}
