"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { permissionsForRole } from "@/lib/auth/app-permissions";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { normalizeAppRole, type AppRole } from "@/lib/types/app-roles";

export type UserProfile = {
  id: string;
  email: string | null;
  nom: string | null;
  prenom: string | null;
  full_name: string | null;
  role: AppRole;
  entraineur_id: string | null;
  avatar_url: string | null;
  actif: boolean;
};

export function useRole() {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const profileResolved = useRef(false);

  const loadProfile = useCallback(async () => {
    if (!user?.id) {
      setProfile(null);
      setLoading(false);
      return;
    }
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      const role = normalizeAppRole(user.frmtRole ?? user.role);
      setProfile({
        id: user.id,
        email: user.email,
        nom: null,
        prenom: null,
        full_name: user.fullName,
        role,
        entraineur_id: null,
        avatar_url: null,
        actif: true,
      });
      setLoading(false);
      return;
    }
    const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
    const role = normalizeAppRole(
      (data?.role as string) ?? user.frmtRole ?? user.appRole ?? user.role
    );
    const full = data?.full_name ?? user.fullName;
    setProfile({
      id: user.id,
      email: data?.email ?? user.email,
      nom: (data?.nom as string) ?? null,
      prenom: (data?.prenom as string) ?? null,
      full_name: full,
      role,
      entraineur_id: (data?.entraineur_id as string) ?? null,
      avatar_url: (data?.avatar_url as string) ?? null,
      actif: data?.actif !== false,
    });
    setLoading(false);
    profileResolved.current = true;
  }, [user]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const role: AppRole = profile?.role ?? (user ? normalizeAppRole(user.appRole ?? user.frmtRole) : "viewer");
  const perms = permissionsForRole(role);

  const waitingAuth = authLoading && !profileResolved.current && !user;
  const waitingProfile = loading && !profileResolved.current;

  return {
    user,
    role,
    profile,
    loading: waitingAuth || waitingProfile,
    refreshProfile: loadProfile,
    isAdmin: role === "admin",
    isEntraineur: role === "entraineur",
    isCoach: role === "coach",
    isViewer: role === "viewer",
    isDirection: role === "direction",
    ...perms,
  };
}
