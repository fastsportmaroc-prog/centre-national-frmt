import type { AppRole } from "@/lib/types/app-roles";

export type PlanningCneAccessInfo = {
  selfOnly: boolean;
  selfJoueurId: string | null;
  canExport: boolean;
  canManageEvents: boolean;
  canSelectPlayers: boolean;
  canShowCoaches: boolean;
  defaultLayout: "timeline" | "planning_cne";
};

export const DEFAULT_PLANNING_CNE_ACCESS: PlanningCneAccessInfo = {
  selfOnly: false,
  selfJoueurId: null,
  canExport: false,
  canManageEvents: false,
  canSelectPlayers: true,
  canShowCoaches: true,
  defaultLayout: "timeline",
};

/** Compte joueur (rôle applicatif ou FRMT). */
export function isJoueurAccountRole(role: AppRole, frmtRole?: string | null): boolean {
  return role === "joueur" || frmtRole === "joueur";
}

export function buildPlanningCneAccessInfo(params: {
  role: AppRole;
  isAdmin: boolean;
  canViewPlayers: boolean;
  canEditPlayers: boolean;
  selfJoueurId: string | null;
  frmtRole?: string | null;
}): PlanningCneAccessInfo {
  const { role, isAdmin, canViewPlayers, canEditPlayers, selfJoueurId, frmtRole } = params;
  const joueurAccount = isJoueurAccountRole(role, frmtRole);
  const selfOnly = joueurAccount && !isAdmin;

  const canSelectPlayers = !selfOnly && canViewPlayers;
  const canShowCoaches =
    !selfOnly &&
    (isAdmin ||
      role === "direction" ||
      role === "coach" ||
      role === "entraineur");

  // Export / impression : tout utilisateur qui peut consulter le planning (module joueurs)
  const canExport =
    (selfOnly && !!selfJoueurId) || (!selfOnly && canViewPlayers);

  const canManageEvents = canEditPlayers && !selfOnly;

  return {
    selfOnly,
    selfJoueurId: selfOnly ? selfJoueurId : null,
    canExport,
    canManageEvents,
    canSelectPlayers,
    canShowCoaches,
    defaultLayout: selfOnly ? "planning_cne" : "timeline",
  };
}
