import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { AuthUser, Profile, UserRole } from "@/lib/types/auth";
import type { RoleUtilisateur } from "@/lib/types/roles";

function mapFrmtRole(profile: Profile | null): RoleUtilisateur {
  const r = profile?.frmt_role;
  if (
    r === "admin" ||
    r === "directeur" ||
    r === "entraineur" ||
    r === "logisticien" ||
    r === "joueur"
  ) {
    return r;
  }
  if (profile?.role === "admin") return "admin";
  return "directeur";
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = createSupabaseBrowserClient();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const p = profile as Profile | null;
  const frmtRole = mapFrmtRole(p);

  return {
    id: user.id,
    email: user.email ?? "",
    role: (p?.role as UserRole) ?? "staff",
    frmtRole,
    fullName: p?.full_name ?? user.user_metadata?.full_name ?? null,
    isMock: false,
  };
}

export async function signIn(email: string, password: string) {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) throw new Error("Supabase non configuré");
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
}

export async function signUp(email: string, password: string, fullName: string) {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) throw new Error("Supabase non configuré");
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });
  if (error) throw new Error(error.message);
}

export async function signOut() {
  const supabase = createSupabaseBrowserClient();
  if (supabase) await supabase.auth.signOut();
}

export function isAdmin(user: AuthUser | null): boolean {
  return user?.role === "admin" || user?.frmtRole === "admin";
}
