import type { PermissionModuleKey } from "@/lib/types/user-permissions";

/** Préfixes de routes associés à chaque rubrique. */
export const MODULE_PATH_PREFIXES: Record<PermissionModuleKey, string[]> = {
  dashboard: ["/v2/dashboard", "/v2", "/v2/classement-national-maroc"],
  players: ["/v2/joueurs", "/v2/programmation-joueurs", "/v2/groupes"],
  coaches: ["/v2/entraineurs"],
  stages: ["/v2/stages"],
  planning: ["/v2/planning", "/v2/calendrier"],
  kinesitherapy: ["/v2/kinesitherapie"],
  accommodation: ["/v2/hebergement"],
  catering: ["/v2/restauration"],
  courts: ["/v2/infrastructures", "/v2/reservations", "/v2/logistique"],
  equipment: ["/v2/materiel"],
  documents: ["/v2/administratif", "/v2/lettres"],
  budgets: ["/v2/budget", "/v2/budget-admin"],
  passports_visas: ["/v2/passeports", "/v2/billets-avion"],
  history: ["/v2/historique"],
  reports: ["/v2/rapports"],
  statistics: ["/v2/statistiques"],
  settings: ["/v2/parametres"],
};

/** Correspondance href de navigation → module (pour filtrage sidebar). */
export const HREF_TO_MODULE: Record<string, PermissionModuleKey> = {
  "/v2/dashboard": "dashboard",
  "/v2/classement-national-maroc": "dashboard",
  "/v2/stages": "stages",
  "/v2/calendrier": "planning",
  "/v2/planning": "planning",
  "/v2/joueurs": "players",
  "/v2/programmation-joueurs": "players",
  "/v2/entraineurs": "coaches",
  "/v2/groupes": "players",
  "/v2/hebergement": "accommodation",
  "/v2/restauration": "catering",
  "/v2/kinesitherapie": "kinesitherapy",
  "/v2/infrastructures": "courts",
  "/v2/reservations": "courts",
  "/v2/materiel": "equipment",
  "/v2/budget": "budgets",
  "/v2/rapports": "reports",
  "/v2/historique": "history",
  "/v2/statistiques": "statistics",
  "/v2/logistique": "courts",
  "/v2/passeports": "passports_visas",
  "/v2/billets-avion": "passports_visas",
  "/v2/lettres": "documents",
  "/v2/administratif/documents": "documents",
  "/v2/budget/facturation-club": "budgets",
  "/v2/parametres": "settings",
  "/competitions": "stages",
};

/** Résout le module à partir d'un pathname. */
export function resolveModuleFromPath(pathname: string): PermissionModuleKey | null {
  if (HREF_TO_MODULE[pathname]) return HREF_TO_MODULE[pathname];

  const sorted = Object.entries(MODULE_PATH_PREFIXES).sort(
    ([, a], [, b]) => Math.max(...b.map((p) => p.length)) - Math.max(...a.map((p) => p.length))
  );

  for (const [moduleKey, prefixes] of sorted) {
    for (const prefix of prefixes.sort((a, b) => b.length - a.length)) {
      if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
        return moduleKey as PermissionModuleKey;
      }
    }
  }

  return null;
}
