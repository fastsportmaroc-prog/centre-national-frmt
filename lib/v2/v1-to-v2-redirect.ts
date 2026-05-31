/** Legacy V1 paths → V2 equivalents (production default). */

const EXACT: Record<string, string> = {
  "/dashboard": "/v2/dashboard",
  "/stages": "/v2/stages",
  "/joueurs": "/v2/joueurs",
  "/entraineurs": "/v2/entraineurs",
  "/groupes": "/v2/groupes",
  "/infrastructures": "/v2/infrastructures",
  "/courts": "/v2/infrastructures",
  "/reservations": "/v2/reservations",
  "/calendrier": "/v2/calendrier",
  "/planning": "/v2/planning",
  "/hebergement": "/v2/hebergement",
  "/restauration": "/v2/restauration",
  "/materiel": "/v2/materiel",
  "/budget": "/v2/budget",
  "/rapports": "/v2/rapports",
  "/historique": "/v2/historique",
  "/parametres": "/v2/parametres",
  "/statistiques": "/v2/statistiques",
  "/billets-avion": "/v2/billets-avion",
  "/logistique": "/v2/logistique",
  "/passeport": "/v2/passeports",
};

/** V1 prefix → V2 prefix for detail routes (id segment preserved). */
const PREFIX: Array<{ from: string; to: string }> = [
  { from: "/stages/", to: "/v2/stages/" },
  { from: "/joueurs/", to: "/v2/joueurs/" },
  { from: "/entraineurs/", to: "/v2/entraineurs/" },
];

/**
 * Returns the V2 URL to redirect to, or null if the path is not a legacy V1 route.
 * Query string is appended unchanged when provided.
 */
export function resolveV2Redirect(pathname: string, search: string): string | null {
  if (pathname.startsWith("/v2")) {
    return null;
  }

  const exact = EXACT[pathname];
  if (exact) {
    return exact + search;
  }

  for (const { from, to } of PREFIX) {
    if (pathname.startsWith(from)) {
      return to + pathname.slice(from.length) + search;
    }
  }

  return null;
}
