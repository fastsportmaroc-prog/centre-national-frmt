import "server-only";

import { authUserIsAppAdmin } from "@/lib/auth/admin-access";
import { checkPermission } from "@/lib/auth/check-permission";
import { loadUserPermissionsServer } from "@/lib/auth/check-permission.server";
import {
  buildPlanningCneAccessInfo,
  type PlanningCneAccessInfo,
} from "@/lib/auth/planning-cne-access";
import { getPlayerCategoryContext } from "@/lib/auth/player-category-context.server";
import { getAuthUserFromServer } from "@/lib/auth/server-session";
import { resolvePlanningCneColumns } from "@/lib/programmation-joueurs/planning-cne-excel.server";
import type { PlanningCneDisplayMode } from "@/lib/programmation-joueurs/planning-cne-grid";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getSupabaseServerDataClient } from "@/lib/supabase/data-client.server";
import type { AuthUser } from "@/lib/types/auth";
import { normalizeAppRole } from "@/lib/types/app-roles";

export type PlanningCneAccessContext = PlanningCneAccessInfo & {
  userId: string;
  role: ReturnType<typeof normalizeAppRole>;
};

export async function resolveSelfJoueurIdForUser(user: AuthUser): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = await getSupabaseServerDataClient();

  const email = user.email?.trim().toLowerCase();
  if (email) {
    const { data: byEmail } = await supabase
      .from("joueurs")
      .select("id")
      .ilike("email", email)
      .limit(2);
    if (byEmail?.length === 1) return byEmail[0]!.id as string;
  }

  const prenom = user.prenom?.trim();
  const nom = user.nom?.trim();
  if (prenom && nom) {
    const { data: byName } = await supabase
      .from("joueurs")
      .select("id")
      .ilike("prenom", prenom)
      .ilike("nom", nom)
      .limit(2);
    if (byName?.length === 1) return byName[0]!.id as string;
  }

  return null;
}

export async function getPlanningCneAccessContext(): Promise<PlanningCneAccessContext | null> {
  const user = await getAuthUserFromServer();
  if (!user) return null;

  const permissions = await loadUserPermissionsServer(user.id);
  const role = normalizeAppRole(user.appRole);
  const isAdmin = authUserIsAppAdmin(user, {
    hasCustomPermissions: permissions.length > 0,
  });
  const canViewPlayers = checkPermission(user, role, permissions, "players", "view");
  const canEditPlayers = checkPermission(user, role, permissions, "players", "edit");
  const selfJoueurId = await resolveSelfJoueurIdForUser(user);

  const info = buildPlanningCneAccessInfo({
    role,
    isAdmin,
    canViewPlayers,
    canEditPlayers,
    selfJoueurId,
    frmtRole: user.frmtRole,
  });

  return { userId: user.id, role, ...info };
}

export async function enforcePlanningCneExportColumns(params: {
  columnIds: string[];
  displayMode: PlanningCneDisplayMode;
  categorieJoueur?: string;
}): Promise<
  | { ok: true; columns: Awaited<ReturnType<typeof resolvePlanningCneColumns>>; access: PlanningCneAccessContext }
  | { ok: false; status: number; error: string }
> {
  const access = await getPlanningCneAccessContext();
  if (!access) return { ok: false, status: 401, error: "Non authentifié" };
  if (!access.canExport) return { ok: false, status: 403, error: "Export non autorisé" };

  const ctx = await getPlayerCategoryContext();

  let columnIds = params.columnIds.filter(Boolean);
  if (access.selfOnly) {
    if (!access.selfJoueurId) {
      return { ok: false, status: 403, error: "Compte non lié à un joueur" };
    }
    columnIds = [access.selfJoueurId];
  }

  if (!columnIds.length) {
    return { ok: false, status: 400, error: "columnIds requis" };
  }

  const displayMode: PlanningCneDisplayMode = access.selfOnly
    ? "joueurs"
    : params.displayMode ?? "joueurs";

  const columns = await resolvePlanningCneColumns({
    columnIds,
    displayMode,
    categorieJoueur: params.categorieJoueur,
    ctx,
  });

  if (!columns.length) {
    return { ok: false, status: 403, error: "Colonnes non autorisées ou introuvables" };
  }

  return { ok: true, columns, access };
}

export async function enforceProgrammationJoueurIds(requestedIds: string[]): Promise<
  | { ok: true; joueurIds: string[] }
  | { ok: false; status: number; error: string }
> {
  const access = await getPlanningCneAccessContext();
  if (!access) return { ok: false, status: 401, error: "Non authentifié" };

  if (access.selfOnly) {
    if (!access.selfJoueurId) {
      return { ok: false, status: 403, error: "Compte non lié à un joueur" };
    }
    return { ok: true, joueurIds: [access.selfJoueurId] };
  }

  const ids = requestedIds.filter(Boolean);
  if (!ids.length) return { ok: false, status: 400, error: "joueurIds requis" };

  const ctx = await getPlayerCategoryContext();
  const columns = await resolvePlanningCneColumns({
    columnIds: ids,
    displayMode: "joueurs",
    ctx,
  });
  const allowed = new Set(columns.filter((c) => c.kind === "joueur").map((c) => c.id));
  const invalid = ids.filter((id) => !allowed.has(id));
  if (invalid.length) return { ok: false, status: 403, error: "Joueurs non autorisés" };

  return { ok: true, joueurIds: ids };
}

export async function requireProgrammationManageAccess(): Promise<
  | { ok: true; access: PlanningCneAccessContext }
  | { ok: false; status: number; error: string }
> {
  const access = await getPlanningCneAccessContext();
  if (!access) return { ok: false, status: 401, error: "Non authentifié" };
  if (!access.canManageEvents) {
    return { ok: false, status: 403, error: "Modification non autorisée" };
  }
  return { ok: true, access };
}
