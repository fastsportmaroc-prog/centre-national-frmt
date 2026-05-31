import type { AppRole } from "@/lib/types/app-roles";

export type AppPermissions = {
  canWrite: boolean;
  canDelete: boolean;
  canSeeBudget: boolean;
  canExportBudget: boolean;
  canSeeRapports: boolean;
  canExportRapports: boolean;
  canSeeParametres: boolean;
  canManageUsers: boolean;
  canSeeHistorique: boolean;
};

export function permissionsForRole(role: AppRole): AppPermissions {
  const isJoueur = role === "joueur" || role === "viewer";
  return {
    canWrite: role === "admin" || role === "entraineur" || role === "direction",
    canDelete: role === "admin",
    canSeeBudget: role === "admin" || role === "direction",
    canExportBudget: role === "admin" || role === "direction",
    canSeeRapports: role === "admin" || role === "direction" || isJoueur,
    canExportRapports: role === "admin" || role === "direction",
    canSeeParametres: role === "admin",
    canManageUsers: role === "admin",
    canSeeHistorique: role === "admin" || role === "direction",
  };
}

const HIDDEN_FOR_COACH = ["/v2/budget", "/v2/budget-admin", "/v2/parametres"];
const HIDDEN_FOR_VIEWER = ["/v2/parametres"];
const BUDGET_ONLY_EXTRA = ["/v2/budget-admin", "/v2/logistique", "/v2/billets-avion"];

export function canAccessV2Href(role: AppRole, href: string): boolean {
  if (role === "admin") return true;
  if (href.startsWith("/v2/parametres")) return false;
  if (HIDDEN_FOR_COACH.includes(href) && (role === "coach" || role === "viewer")) return false;
  if (href.startsWith("/v2/budget") && !permissionsForRole(role).canSeeBudget) return false;
  if (href.startsWith("/v2/historique") && !permissionsForRole(role).canSeeHistorique) return false;
  if (role === "direction") {
    if (href.startsWith("/v2/parametres")) return false;
    if (BUDGET_ONLY_EXTRA.some((p) => href.startsWith(p))) return false;
    return true;
  }
  if (role === "viewer") {
    return !HIDDEN_FOR_VIEWER.some((p) => href.startsWith(p));
  }
  if (role === "coach") {
    return (
      href.includes("/planning") ||
      href.includes("/dashboard") ||
      href.includes("/calendrier") ||
      href.includes("/reservations")
    );
  }
  if (role === "joueur") {
    return (
      href.includes("/dashboard") ||
      href.startsWith("/v2/joueurs") ||
      href.includes("/calendrier")
    );
  }
  if (role === "entraineur") {
    return (
      !href.startsWith("/v2/budget") &&
      !href.startsWith("/v2/parametres") &&
      !href.includes("budget-admin")
    );
  }
  return true;
}
