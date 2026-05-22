import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin.server";

export type RepairAccountResult = {
  ok: boolean;
  message: string;
  userId?: string;
  email?: string;
};

/**
 * Repare un compte auth : confirme email, mot de passe, profil public.
 * Necessite SUPABASE_SERVICE_ROLE_KEY dans .env.local (serveur uniquement).
 */
export async function repairAuthAccount(
  email: string,
  password: string,
  options?: { role?: "admin" | "staff"; frmtRole?: string; fullName?: string }
): Promise<RepairAccountResult> {
  const admin = createSupabaseAdminClient();
  if (!admin) {
    return {
      ok: false,
      message:
        "Ajoutez SUPABASE_SERVICE_ROLE_KEY dans .env.local (Supabase -> Settings -> API -> service_role)",
    };
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || password.length < 6) {
    return { ok: false, message: "Email et mot de passe (6+ caracteres) requis" };
  }

  const { data: list, error: listError } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (listError) {
    return { ok: false, message: `Liste utilisateurs: ${listError.message}` };
  }

  let user = list.users.find((u) => u.email?.toLowerCase() === normalizedEmail);

  if (!user) {
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: options?.fullName ?? "Utilisateur FRMT",
        role: options?.role ?? "admin",
        frmt_role: options?.frmtRole ?? "admin",
      },
    });
    if (createError) {
      return { ok: false, message: `Creation compte: ${createError.message}` };
    }
    user = created.user;
  } else {
    const { error: updateError } = await admin.auth.admin.updateUserById(user.id, {
      password,
      email_confirm: true,
    });
    if (updateError) {
      return { ok: false, message: `Mise a jour auth: ${updateError.message}` };
    }
  }

  if (!user) {
    return { ok: false, message: "Utilisateur introuvable apres reparation" };
  }

  const role = options?.role ?? "admin";
  const frmtRole = options?.frmtRole ?? "admin";

  const { error: profileError } = await admin.from("profiles").upsert(
    {
      id: user.id,
      email: user.email ?? normalizedEmail,
      full_name: options?.fullName ?? user.user_metadata?.full_name ?? "FRMT",
      role,
      frmt_role: frmtRole,
    },
    { onConflict: "id" }
  );

  if (profileError) {
    return {
      ok: false,
      message: `Profil public: ${profileError.message}. Executez supabase/migrations/020_auth_compte_frmt.sql`,
    };
  }

  return {
    ok: true,
    message: "Compte repare : email confirme, mot de passe et profil OK",
    userId: user.id,
    email: user.email ?? normalizedEmail,
  };
}
