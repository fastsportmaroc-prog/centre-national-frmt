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

  clearSupabaseBrowserStorage();

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 1500);
    await fetch("/api/auth/clear", {
      method: "POST",
      credentials: "include",
      cache: "no-store",
      signal: ctrl.signal,
    });
    clearTimeout(timer);
  } catch {
    /* réseau lent ou requête annulée — on redirige quand même */
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
