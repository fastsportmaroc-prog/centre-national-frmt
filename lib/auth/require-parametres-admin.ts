import "server-only";

import { getAuthUserFromServer } from "@/lib/auth/server-session";
import { authUserIsAppAdmin } from "@/lib/auth/admin-access";
import { resolveEffectiveAppRole } from "@/lib/auth/passeports-access";
import { permissionsForRole } from "@/lib/auth/app-permissions";
import type { AuthUser } from "@/lib/types/auth";
import type { AppRole } from "@/lib/types/app-roles";

export type ParametresAdminContext = {
  user: AuthUser;
  appRole: AppRole;
};

/** Session admin effective pour Paramètres (corrige appRole viewer + frmt_role admin). */
export async function requireParametresAdmin(): Promise<ParametresAdminContext | null> {
  const user = await getAuthUserFromServer();
  if (!user) return null;

  const appRole = resolveEffectiveAppRole(user);
  if (!permissionsForRole(appRole).canSeeParametres && !authUserIsAppAdmin(user)) return null;

  return { user, appRole: authUserIsAppAdmin(user) ? "admin" : appRole };
}

/** Gestion des comptes (invitation, rôles). */
export async function requireManageUsersAdmin(): Promise<ParametresAdminContext | null> {
  const ctx = await requireParametresAdmin();
  if (!ctx) return null;
  if (!permissionsForRole(ctx.appRole).canManageUsers) return null;
  return ctx;
}
