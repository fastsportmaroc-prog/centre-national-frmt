import type { AuthUser } from "@/lib/types/auth";
import type { AppRole } from "@/lib/types/app-roles";
import { authUserIsAppAdmin } from "@/lib/auth/admin-access";

/** Rôles autorisés sur Passeports & Visas (aligné facturation / logistique). */
export const PASSEPORTS_ALLOWED_ROLES: AppRole[] = ["admin", "direction", "viewer", "entraineur"];

export function canAccessPasseports(role: AppRole): boolean {
  return PASSEPORTS_ALLOWED_ROLES.includes(role);
}

/** Peut créer / modifier des documents. */
export function canManagePasseports(role: AppRole): boolean {
  return (
    role === "admin" ||
    role === "direction" ||
    role === "viewer" ||
    role === "entraineur"
  );
}

/** Peut supprimer des documents. */
export function canDeletePasseports(role: AppRole): boolean {
  return canManagePasseports(role);
}

/**
 * Rôle effectif — corrige le cas profil Supabase inaccessible (RLS)
 * où appRole retombe sur viewer alors que frmtRole = directeur/admin.
 */
export function resolveEffectiveAppRole(user: AuthUser): AppRole {
  if (authUserIsAppAdmin(user)) return "admin";

  let role = user.appRole;
  if (role === "viewer") {
    if (user.frmtRole === "directeur") role = "direction";
    else if (user.frmtRole === "admin") role = "admin";
    else if (user.role === "admin") role = "admin";
  }
  if (user.frmtRole === "admin" && role !== "admin") return "admin";
  return role;
}

export function authUserCanAccessPasseports(user: AuthUser | null): boolean {
  if (!user) return false;
  return canAccessPasseports(resolveEffectiveAppRole(user));
}
