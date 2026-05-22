"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { getCurrentUser } from "@/lib/auth/session";
import { logoutAction } from "@/lib/auth/actions";
import { purgeInvalidSession } from "@/lib/auth/purge-session.client";
import { isInvalidRefreshTokenError } from "@/lib/auth/session-errors";
import { setAuditUser } from "@/lib/audit/historique";
import type { AuthUser } from "@/lib/types/auth";

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  refresh: async () => {},
  logout: async () => {},
});

type Props = {
  children: React.ReactNode;
  initialUser?: AuthUser | null;
};

export function AuthProvider({ children, initialUser = null }: Props) {
  const [user, setUser] = useState<AuthUser | null>(initialUser);
  const [loading, setLoading] = useState(initialUser === null);
  const refreshing = useRef(false);

  const refresh = useCallback(async () => {
    if (refreshing.current) return;
    refreshing.current = true;
    setLoading(true);
    try {
      const u = await getCurrentUser();
      setUser(u);
      if (u) setAuditUser(u.fullName ?? u.email, u.frmtRole ?? u.role);
    } catch (error) {
      if (isInvalidRefreshTokenError(error)) {
        setUser(null);
        await purgeInvalidSession({ redirect: true });
      }
    } finally {
      setLoading(false);
      refreshing.current = false;
    }
  }, []);

  useEffect(() => {
    if (!initialUser) void refresh();
    else setLoading(false);
  }, [initialUser, refresh]);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === "SIGNED_OUT") {
        setUser(null);
        setLoading(false);
        return;
      }
      if (event === "SIGNED_IN") {
        await refresh();
        return;
      }
      if (event === "TOKEN_REFRESHED") {
        return;
      }
    });

    return () => subscription.unsubscribe();
  }, [refresh]);

  async function logout() {
    try {
      await fetch("/api/auth/clear", { method: "POST", credentials: "include" });
    } catch {
      /* ignore */
    }
    const { clearSupabaseBrowserStorage } = await import("@/lib/auth/clear-client-storage");
    clearSupabaseBrowserStorage();
    await logoutAction();
  }

  return (
    <AuthContext.Provider value={{ user, loading, refresh, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
