import { authUserIsAppAdmin } from "@/lib/auth/admin-access";
import { canAccessV2Href } from "@/lib/auth/app-permissions";
import { resolveModuleFromPath } from "@/lib/auth/module-registry";
import { resolveEffectiveAppRole } from "@/lib/auth/passeports-access";
import type { AuthUser } from "@/lib/types/auth";
import type { AppRole } from "@/lib/types/app-roles";
import type { PermissionAction, PermissionModuleKey, UserPermission } from "@/lib/types/user-permissions";

export type PermissionMap = Map<PermissionModuleKey, Pick<UserPermission, "can_view" | "can_edit">>;

export function buildPermissionMap(rows: UserPermission[]): PermissionMap {
  const map: PermissionMap = new Map();
  for (const row of rows) {
    map.set(row.module_key, { can_view: row.can_view, can_edit: row.can_edit });
  }
  return map;
}

export function hasCustomPermissions(rows: UserPermission[]): boolean {
  return rows.length > 0;
}

/**
 * Vérifie si un utilisateur peut accéder à un module.
 * - Admin : accès total
 * - Permissions personnalisées : whitelist stricte par module
 * - Sinon : repli sur les règles de rôle existantes
 */
export function checkPermission(
  user: AuthUser | null,
  role: AppRole,
  permissions: UserPermission[],
  moduleKey: PermissionModuleKey,
  action: PermissionAction = "view"
): boolean {
  if (!user) return false;
  const custom = hasCustomPermissions(permissions);
  if (authUserIsAppAdmin(user, { hasCustomPermissions: custom })) return true;

  if (custom) {
    const perm = permissions.find((p) => p.module_key === moduleKey);
    if (!perm) return false;
    return action === "edit" ? perm.can_edit : perm.can_view;
  }

  const prefixes = {
    dashboard: "/v2/dashboard",
    players: "/v2/joueurs",
    coaches: "/v2/entraineurs",
    stages: "/v2/stages",
    planning: "/v2/planning",
    kinesitherapy: "/v2/kinesitherapie",
    accommodation: "/v2/hebergement",
    catering: "/v2/restauration",
    courts: "/v2/infrastructures",
    equipment: "/v2/materiel",
    documents: "/v2/administratif/documents",
    budgets: "/v2/budget",
    passports_visas: "/v2/passeports",
    history: "/v2/historique",
    reports: "/v2/rapports",
    statistics: "/v2/statistiques",
    settings: "/v2/parametres",
  } as const;

  const effectiveRole = resolveEffectiveAppRole(user) ?? role;
  return canAccessV2Href(effectiveRole, prefixes[moduleKey]);
}

export function checkPathPermission(
  user: AuthUser | null,
  role: AppRole,
  permissions: UserPermission[],
  pathname: string,
  action: PermissionAction = "view"
): boolean {
  if (!user) return false;
  const custom = hasCustomPermissions(permissions);
  if (authUserIsAppAdmin(user, { hasCustomPermissions: custom })) return true;

  const moduleKey = resolveModuleFromPath(pathname);
  if (!moduleKey) {
    return custom ? false : true;
  }

  return checkPermission(user, role, permissions, moduleKey, action);
}

/** Version serveur avec userId explicite (pour API). */
export function checkPermissionForUserId(
  userId: string,
  currentUser: AuthUser | null,
  role: AppRole,
  permissions: UserPermission[],
  moduleKey: PermissionModuleKey,
  action: PermissionAction = "view"
): boolean {
  if (!currentUser || currentUser.id !== userId) {
    return checkPermission(currentUser, role, permissions, moduleKey, action);
  }
  return checkPermission(currentUser, role, permissions, moduleKey, action);
}
