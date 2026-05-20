"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getCurrentUser, signOut } from "@/lib/auth/session";
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const u = await getCurrentUser();
      setUser(u);
      if (u) setAuditUser(u.fullName ?? u.email, u.frmtRole ?? u.role);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) void refresh();
      else setUser(null);
    });

    return () => subscription.unsubscribe();
  }, [refresh]);

  async function logout() {
    await signOut();
    setUser(null);
    window.location.href = "/auth/login";
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
