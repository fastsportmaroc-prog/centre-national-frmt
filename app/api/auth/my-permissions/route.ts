import { NextResponse } from "next/server";
import { authUserIsAppAdmin } from "@/lib/auth/admin-access";
import { checkPermission, hasCustomPermissions } from "@/lib/auth/check-permission";
import {
  loadPlayerCategoriesServer,
  loadUserPermissionsServer,
} from "@/lib/auth/check-permission.server";
import { buildPlanningCneAccessInfo } from "@/lib/auth/planning-cne-access";
import { resolveSelfJoueurIdForUser } from "@/lib/auth/planning-cne-access.server";
import { getAuthUserFromServer } from "@/lib/auth/server-session";
import { normalizeAppRole } from "@/lib/types/app-roles";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const user = await getAuthUserFromServer();
  if (!user) {
    return NextResponse.json(
      { permissions: [], playerCategories: [], hasCustom: false, planningCne: null },
      { status: 401 }
    );
  }

  const permissions = await loadUserPermissionsServer(user.id);
  const playerCategories = await loadPlayerCategoriesServer(user.id);
  const hasCustom = hasCustomPermissions(permissions);
  const role = normalizeAppRole(user.appRole);
  const isAdmin = authUserIsAppAdmin(user, { hasCustomPermissions: hasCustom });
  const selfJoueurId = await resolveSelfJoueurIdForUser(user);

  const planningCne = buildPlanningCneAccessInfo({
    role,
    isAdmin,
    canViewPlayers: checkPermission(user, role, permissions, "players", "view"),
    canEditPlayers: checkPermission(user, role, permissions, "players", "edit"),
    selfJoueurId,
    frmtRole: user.frmtRole,
  });

  if (isAdmin) {
    return NextResponse.json(
      {
        permissions: [],
        playerCategories: [],
        hasCustom: false,
        planningCne: buildPlanningCneAccessInfo({
          role,
          isAdmin: true,
          canViewPlayers: true,
          canEditPlayers: true,
          selfJoueurId: null,
          frmtRole: user.frmtRole,
        }),
      },
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
    );
  }

  return NextResponse.json(
    { permissions, playerCategories, hasCustom, planningCne },
    { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
  );
}
