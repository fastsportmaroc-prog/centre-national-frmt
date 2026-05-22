import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isInvalidRefreshTokenError } from "@/lib/auth/session-errors";
import { purgeSupabaseAuthServer } from "@/lib/auth/purge-session.server";
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

function toAuthUser(user: User, profile: Profile | null): AuthUser {
  return {
    id: user.id,
    email: user.email ?? "",
    role: (profile?.role as UserRole) ?? "staff",
    frmtRole: mapFrmtRole(profile),
    fullName: profile?.full_name ?? user.user_metadata?.full_name ?? null,
    isMock: false,
  };
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

  return toAuthUser(user, profile as Profile | null);
}
