import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin.server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isInvalidRefreshTokenError } from "@/lib/auth/session-errors";
import { purgeSupabaseAuthServer } from "@/lib/auth/purge-session.server";
import type { AuthUser, Profile, UserRole } from "@/lib/types/auth";
import { resolveEffectiveAppRole } from "@/lib/auth/passeports-access";
import { normalizeAppRole, type AppRole } from "@/lib/types/app-roles";
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

function toAuthUser(user: User, profile: Profile | null): AuthUser {
  const meta = user.user_metadata ?? {};
  const metaRole = String(
    (meta as Record<string, unknown>).role ??
      (meta as Record<string, unknown>).frmt_role ??
      (meta as Record<string, unknown>).app_role ??
      ""
  );
  const frmtRole = mapFrmtRole(profile);
  let appRole = normalizeAppRole(profile?.role ?? profile?.frmt_role ?? metaRole);

  const authUser: AuthUser = {
    id: user.id,
    email: user.email ?? "",
    role: profile?.role === "admin" || appRole === "admin" ? "admin" : "staff",
    appRole,
    frmtRole,
    fullName: profile?.full_name ?? user.user_metadata?.full_name ?? null,
    prenom: profile?.prenom ?? null,
    nom: profile?.nom ?? null,
    isMock: false,
  };

  return { ...authUser, appRole: resolveEffectiveAppRole(authUser) };
}

/** Session lue depuis les cookies HTTP (serveur) — source de vérité après login. */
export async function getAuthUserFromServer(): Promise<AuthUser | null> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  let user: User | null = null;

  try {
    const {
      data: { user: authUser },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      if (isInvalidRefreshTokenError(userError)) {
        await purgeSupabaseAuthServer();
      }
      return null;
    }

    user = authUser;
  } catch (error) {
    if (isInvalidRefreshTokenError(error)) {
      await purgeSupabaseAuthServer();
    }
    return null;
  }

  if (!user) return null;

  let { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError && profileError.code !== "PGRST116") {
    console.warn("[getAuthUserFromServer] profiles:", profileError.message);
  }

  if (!profile) {
    const { error: rpcError } = await supabase.rpc("ensure_my_profile");
    if (rpcError && !rpcError.message.includes("Could not find the function")) {
      console.warn("[getAuthUserFromServer] ensure_my_profile:", rpcError.message);
    }
    const retry = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
    profile = retry.data as Profile | null;
  }

  // Lecture fiable du rôle (évite 403 Paramètres si RLS bloque profiles)
  const admin = createSupabaseAdminClient();
  if (admin) {
    const { data: profileAdmin, error: adminProfileErr } = await admin
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();
    if (adminProfileErr) {
      console.warn("[getAuthUserFromServer] profiles (service):", adminProfileErr.message);
    } else if (profileAdmin) {
      profile = profileAdmin as Profile;
    }
  }

  return toAuthUser(user, profile as Profile | null);
}
