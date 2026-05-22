"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { purgeInvalidSession } from "@/lib/auth/purge-session.client";
import { isInvalidRefreshTokenError } from "@/lib/auth/session-errors";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

/**
 * Au chargement : détecte refresh token invalide, purge storage/cookies,
 * évite les boucles AuthApiError.
 */
export function SupabaseSessionCleanup() {
  const pathname = usePathname();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    async function ensureCleanSession() {
      try {
        const meRes = await fetch("/api/auth/me", {
          credentials: "include",
          cache: "no-store",
        });
        const body = (await meRes.json()) as {
          user?: unknown;
          sessionExpired?: boolean;
          error?: string;
        };

        if (body.sessionExpired || body.error === "session_expired") {
          await purgeInvalidSession({
            redirect: !pathname.startsWith("/auth"),
            reason: "session_expired",
          });
          return;
        }

        if (meRes.ok && body.user) return;

        const supabase = createSupabaseBrowserClient();
        if (!supabase) return;

        const { error } = await supabase.auth.getUser();
        if (error && isInvalidRefreshTokenError(error)) {
          await purgeInvalidSession({
            redirect: !pathname.startsWith("/auth"),
            reason: "session_expired",
          });
        }
      } catch {
        /* ignore */
      }
    }

    void ensureCleanSession();
  }, [pathname]);

  return null;
}
