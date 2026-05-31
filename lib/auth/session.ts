import type { AuthUser } from "@/lib/types/auth";
import { authUserIsAppAdmin } from "@/lib/auth/admin-access";
import { isInvalidRefreshTokenError } from "@/lib/auth/session-errors";

/** Session client via /api/auth/me (pas d'import serveur — évite fuite server-only). */
export async function getCurrentUser(): Promise<AuthUser | null> {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const res = await fetch("/api/auth/me", {
      credentials: "include",
      cache: "no-store",
    });
    if (!res.ok) return null;
    const body = (await res.json()) as {
      user: AuthUser | null;
      sessionExpired?: boolean;
    };
    if (body.sessionExpired) return null;
    return body.user ?? null;
  } catch {
    return null;
  }
}

/** Détecte erreur refresh côté client (fetch / Supabase). */
export function handleAuthClientError(error: unknown): boolean {
  if (!isInvalidRefreshTokenError(error)) return false;
  if (typeof window === "undefined") return false;
  void import("@/lib/auth/purge-session.client").then(({ purgeInvalidSession }) =>
    purgeInvalidSession({ redirect: true, reason: "session_expired" })
  );
  return true;
}

export function isAdmin(user: AuthUser | null): boolean {
  return user ? authUserIsAppAdmin(user) : false;
}
