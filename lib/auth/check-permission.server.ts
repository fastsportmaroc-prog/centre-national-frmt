import "server-only";

import { checkPermission } from "@/lib/auth/check-permission";
import { getAuthUserFromServer } from "@/lib/auth/server-session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin.server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { normalizeAppRole } from "@/lib/types/app-roles";
import type { PermissionAction, PermissionModuleKey, UserPermission } from "@/lib/types/user-permissions";

/** Charge les permissions utilisateur (service role prioritaire — fiable côté serveur). */
export async function loadUserPermissionsServer(userId: string): Promise<UserPermission[]> {
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

/** Catégories joueurs autorisées (vide = toutes). */
export async function loadPlayerCategoriesServer(userId: string): Promise<string[]> {
  const admin = createSupabaseAdminClient();
  if (admin) {
    const { data } = await admin
      .from("user_player_category_access")
      .select("category_key")
      .eq("user_id", userId)
      .eq("can_view", true);
    return (data ?? []).map((r) => r.category_key as string);
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("user_player_category_access")
    .select("category_key")
    .eq("user_id", userId)
    .eq("can_view", true);
  return (data ?? []).map((r) => r.category_key as string);
}

/**
 * Vérifie les droits d'un utilisateur sur une rubrique (serveur).
 * Utilise l'utilisateur courant si userId correspond à la session.
 */
export async function checkPermissionByUserId(
  userId: string,
  moduleKey: PermissionModuleKey,
  action: PermissionAction = "view"
): Promise<boolean> {
  const user = await getAuthUserFromServer();
  if (!user || user.id !== userId) {
    return false;
  }

  const permissions = await loadUserPermissionsServer(userId);
  const role = normalizeAppRole(user.appRole);
  return checkPermission(user, role, permissions, moduleKey, action);
}
