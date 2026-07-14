import "server-only";

import { checkPermission } from "@/lib/auth/check-permission";
import { getAuthUserFromServer } from "@/lib/auth/server-session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin.server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { normalizeAppRole } from "@/lib/types/app-roles";
import type { PermissionModuleKey, UserPermission } from "@/lib/types/user-permissions";

async function loadUserPermissions(userId: string): Promise<UserPermission[]> {
  const admin = createSupabaseAdminClient();
  if (admin) {
    const { data } = await admin
      .from("user_permissions")
      .select("module_key, can_view, can_edit")
      .eq("user_id", userId);
    return (data ?? []).map((r) => ({
      user_id: userId,
      module_key: r.module_key as PermissionModuleKey,
      can_view: r.can_view,
      can_edit: r.can_edit,
    }));
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("user_permissions")
    .select("module_key, can_view, can_edit")
    .eq("user_id", userId);
  return (data ?? []).map((r) => ({
    user_id: userId,
    module_key: r.module_key as PermissionModuleKey,
    can_view: r.can_view,
    can_edit: r.can_edit,
  }));
}

/** Vérifie l'accès module côté serveur (API routes, server actions). */
export async function requireModuleAccess(
  moduleKey: PermissionModuleKey,
  action: "view" | "edit" = "view"
): Promise<{ ok: true; userId: string } | { ok: false; status: number; error: string }> {
  const user = await getAuthUserFromServer();
  if (!user) return { ok: false, status: 401, error: "Non authentifié" };

  const permissions = await loadUserPermissions(user.id);
  const role = normalizeAppRole(user.appRole);

  if (!checkPermission(user, role, permissions, moduleKey, action)) {
    return { ok: false, status: 403, error: "Accès non autorisé" };
  }

  return { ok: true, userId: user.id };
}
