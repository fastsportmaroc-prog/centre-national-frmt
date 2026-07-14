import "server-only";

import { authUserIsAppAdmin } from "@/lib/auth/admin-access";
import { hasCustomPermissions } from "@/lib/auth/check-permission";
import {
  loadPlayerCategoriesServer,
  loadUserPermissionsServer,
} from "@/lib/auth/check-permission.server";
import {
  buildPlayerCategoryContext,
  type PlayerCategoryContext,
} from "@/lib/auth/player-category-context";
import { getAuthUserFromServer } from "@/lib/auth/server-session";
import { resolveEffectiveAppRole } from "@/lib/auth/passeports-access";
import { normalizeAppRole, type AppRole } from "@/lib/types/app-roles";

export type ServerPlayerCategoryContext = PlayerCategoryContext & {
  userId: string | null;
  role: AppRole;
  isAdmin: boolean;
};

const OPEN_CTX: ServerPlayerCategoryContext = {
  userId: null,
  role: "viewer",
  isAdmin: false,
  allowedCategories: [],
  bypassFilter: true,
  restricted: false,
};

export async function getPlayerCategoryContextForUser(
  userId: string,
  role: AppRole,
  isAdmin: boolean
): Promise<ServerPlayerCategoryContext> {
  const allowedCategories = await loadPlayerCategoriesServer(userId);
  const base = buildPlayerCategoryContext(role, isAdmin, allowedCategories);
  return { userId, role, isAdmin, ...base };
}

/** Contexte catégories de l'utilisateur connecté (source unique côté serveur). */
export async function getPlayerCategoryContext(): Promise<ServerPlayerCategoryContext> {
  const user = await getAuthUserFromServer();
  if (!user) return OPEN_CTX;

  const permissions = await loadUserPermissionsServer(user.id);
  const hasCustom = hasCustomPermissions(permissions);
  const isAdmin = authUserIsAppAdmin(user, { hasCustomPermissions: hasCustom });
  const role = normalizeAppRole(resolveEffectiveAppRole(user));

  return getPlayerCategoryContextForUser(user.id, role, isAdmin);
}
