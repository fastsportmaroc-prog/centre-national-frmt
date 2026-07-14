import type { AppRole } from "@/lib/types/app-roles";
import type { PermissionModuleKey } from "@/lib/types/user-permissions";

export type AppPermissions = {
  canWrite: boolean;
  canDelete: boolean;
  canSeeBudget: boolean;
  canExportBudget: boolean;
  canSeeRapports: boolean;
  canSeeStatistiques: boolean;
  canExportRapports: boolean;
  canSeeParametres: boolean;
  canManageUsers: boolean;
  canSeeHistorique: boolean;
};

export function permissionsForRole(role: AppRole): AppPermissions {
  const isJoueur = role === "joueur" || role === "viewer";
  return {
    canWrite: role === "admin" || role === "entraineur" || role === "direction" || role === "coach",
    canDelete: role === "admin",
    canSeeBudget: role === "admin" || role === "direction",
    canExportBudget: role === "admin" || role === "direction",
    canSeeRapports: role === "admin" || role === "direction" || isJoueur,
    canSeeStatistiques:
      role === "admin" || role === "direction" || role === "entraineur" || role === "coach",
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
  if (href.startsWith("/v2/rapports") && !permissionsForRole(role).canSeeRapports) return false;
  if (href.startsWith("/v2/statistiques") && !permissionsForRole(role).canSeeStatistiques) return false;
  if (role === "direction") {
    if (href.startsWith("/v2/parametres")) return false;
    if (BUDGET_ONLY_EXTRA.some((p) => href.startsWith(p))) return false;
    return true;
  }
  if (role === "viewer") {
    if (HIDDEN_FOR_VIEWER.some((p) => href.startsWith(p))) return false;
    return (
      href.includes("/dashboard") ||
      href.startsWith("/v2/joueurs") ||
      href.startsWith("/v2/stages") ||
      href.includes("/calendrier") ||
      href.startsWith("/v2/rapports")
    );
  }
  if (role === "coach") {
    if (HIDDEN_FOR_COACH.includes(href)) return false;
    return (
      href.includes("/planning") ||
      href.includes("/dashboard") ||
      href.includes("/calendrier") ||
      href.includes("/reservations") ||
      href.startsWith("/v2/joueurs") ||
      href.startsWith("/v2/stages") ||
      href.startsWith("/v2/entraineurs") ||
      href.startsWith("/v2/kinesitherapie") ||
      href.startsWith("/v2/materiel") ||
      href.startsWith("/v2/infrastructures")
    );
  }
  if (role === "joueur") {
    return (
      href.includes("/dashboard") ||
      href.startsWith("/v2/joueurs") ||
      href.includes("/calendrier") ||
      href.startsWith("/v2/programmation-joueurs")
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

/** Vérifie l'accès à une rubrique (repli rôle uniquement — utiliser checkPermission pour les permissions utilisateur). */
export function canAccessModule(role: AppRole, moduleKey: PermissionModuleKey): boolean {
  const prefixes: Record<PermissionModuleKey, string> = {
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
  };
  return canAccessV2Href(role, prefixes[moduleKey]);
}
