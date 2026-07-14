import { canAccessModule, permissionsForRole } from "@/lib/auth/app-permissions";
import type { AppRole } from "@/lib/types/app-roles";
import {
  PERMISSION_MODULE_KEYS,
  type PermissionModuleKey,
} from "@/lib/types/user-permissions";
import type { ParametresAccessRole } from "@/lib/v2/access-roles-config";

export type PermissionDraftItem = {
  module_key: PermissionModuleKey;
  can_view: boolean;
  can_edit: boolean;
};

export function parametresRoleToAppRole(role: ParametresAccessRole): AppRole {
  if (role === "custom") return "viewer";
  if (role === "direction") return "direction";
  return role;
}

/** Preset modules pour un rôle standard (sans personnalisation). */
export function buildRolePermissionPreset(role: AppRole): PermissionDraftItem[] {
  const perms = permissionsForRole(role);
  const readOnly = role === "viewer" || role === "joueur";

  return PERMISSION_MODULE_KEYS.map((module_key) => {
    const can_view = canAccessModule(role, module_key);
    const can_edit =
      can_view &&
      !readOnly &&
      perms.canWrite &&
      module_key !== "settings" &&
      (role === "admin" || module_key !== "budgets" || perms.canSeeBudget);
    return { module_key, can_view, can_edit };
  });
}

export function draftFromPermissions(
  items: PermissionDraftItem[]
): Record<PermissionModuleKey, { can_view: boolean; can_edit: boolean }> {
  const base = Object.fromEntries(
    PERMISSION_MODULE_KEYS.map((k) => [k, { can_view: false, can_edit: false }])
  ) as Record<PermissionModuleKey, { can_view: boolean; can_edit: boolean }>;
  for (const item of items) {
    base[item.module_key] = { can_view: item.can_view, can_edit: item.can_edit };
  }
  return base;
}

export function draftToPermissionPayload(
  draft: Record<PermissionModuleKey, { can_view: boolean; can_edit: boolean }>
): PermissionDraftItem[] {
  return PERMISSION_MODULE_KEYS.map((module_key) => ({
    module_key,
    can_view: draft[module_key].can_view,
    can_edit: draft[module_key].can_view ? draft[module_key].can_edit : false,
  }));
}

export function countGrantedViews(
  draft: Record<PermissionModuleKey, { can_view: boolean; can_edit: boolean }>
): number {
  return PERMISSION_MODULE_KEYS.filter((k) => draft[k].can_view).length;
}
