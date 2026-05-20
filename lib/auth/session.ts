import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { mapAuthErrorMessage } from "@/lib/auth/errors";
import type { AuthUser, Profile, UserRole } from "@/lib/types/auth";
import type { RoleUtilisateur } from "@/lib/types/roles";
import type { User } from "@supabase/supabase-js";

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

async function ensureProfileRow(supabase: ReturnType<typeof createSupabaseBrowserClient>) {
  if (!supabase) return;
  const { error } = await supabase.rpc("ensure_my_profile");
  if (error && !error.message.includes("Could not find the function")) {
    console.warn("[auth] ensure_my_profile:", error.message);
  }
}

function profileFromUser(user: User, p: Profile | null): AuthUser {
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

export async function getCurrentUser(): Promise<AuthUser | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = createSupabaseBrowserClient();
  if (!supabase) return null;

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) return null;

  let { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError?.code === "PGRST116" || !profile) {
    await ensureProfileRow(supabase);
    const retry = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
    profile = retry.data;
  }

  const p = profile as Profile | null;
  return profileFromUser(user, p);
}

export async function signIn(email: string, password: string) {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) throw new Error("Supabase non configuré");

  const normalizedEmail = email.trim().toLowerCase();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  });

  if (error) throw new Error(mapAuthErrorMessage(error.message));
  if (!data.session) {
    throw new Error(
      "Connexion refusée : session non créée. Vérifiez que l'utilisateur est « confirmé » dans Supabase (Authentication → Users)."
    );
  }

  await ensureProfileRow(supabase);
}

export async function signUp(email: string, password: string, fullName: string) {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) throw new Error("Supabase non configuré");
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });
  if (error) throw new Error(mapAuthErrorMessage(error.message));
}

export async function signOut() {
  const supabase = createSupabaseBrowserClient();
  if (supabase) await supabase.auth.signOut();
}

export function isAdmin(user: AuthUser | null): boolean {
  return user?.role === "admin" || user?.frmtRole === "admin";
}
