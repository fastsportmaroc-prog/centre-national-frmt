import type { PermissionModuleKey } from "@/lib/types/user-permissions";

/** Routes API publiques (pas de contrôle module). */
export const PUBLIC_API_PREFIXES = [
  "/api/auth",
  "/api/health",
  "/api/status",
  "/api/frmt-logo",
  "/api/stages/count",
] as const;

/** Routes API réservées aux administrateurs (gestion utilisateurs, migrations). */
export const ADMIN_ONLY_API_PREFIXES = [
  "/api/admin/users",
  "/api/admin/ensure",
  "/api/dev",
] as const;

/** Préfixes API → rubrique (contrôle serveur). */
const API_MODULE_PREFIXES: { prefix: string; module: PermissionModuleKey; edit?: boolean }[] = [
  { prefix: "/api/competitions", module: "stages" },
  { prefix: "/api/programmation-joueurs", module: "players" },
  { prefix: "/api/admin-documents", module: "documents" },
  { prefix: "/api/entraineurs", module: "coaches" },
];

export function isPublicApiPath(pathname: string): boolean {
  return PUBLIC_API_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

export function isAdminOnlyApiPath(pathname: string): boolean {
  return ADMIN_ONLY_API_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

export function resolveApiModule(pathname: string): PermissionModuleKey | null {
  for (const { prefix, module } of API_MODULE_PREFIXES.sort(
    (a, b) => b.prefix.length - a.prefix.length
  )) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      return module;
    }
  }
  return null;
}
