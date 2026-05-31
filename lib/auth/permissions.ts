import type { AuthUser } from "@/lib/types/auth";
import type { PermissionModule, RoleUtilisateur } from "@/lib/types/roles";
import { roleCan } from "@/lib/types/roles";

/** Rôle FRMT effectif (profil Supabase ou défaut). */
export function resolveFrmtRole(user: AuthUser | null): RoleUtilisateur {
  if (!user) return "directeur";
  const r = user.frmtRole;
  if (
    r === "admin" ||
    r === "directeur" ||
    r === "entraineur" ||
    r === "logisticien" ||
    r === "joueur"
  ) {
    return r;
  }
  if (user.role === "admin") return "admin";
  return "directeur";
}

const HREF_MODULE: Record<string, PermissionModule | null> = {
  "/dashboard": null,
  "/joueurs": "joueurs",
  "/entraineurs": "entraineurs",
  "/budget": "budget",
  "/budget/deplacements": "budget",
  "/budget/previsionnels": "budget",
  "/groupes": "joueurs",
  "/infrastructures": "joueurs",
  "/materiel": "logistique",
  "/reservations": "joueurs",
  "/calendrier": "joueurs",
  "/planning": "joueurs",
  "/hebergement": "hebergement",
  "/stages": "stages",
  "/restauration": "logistique",
  "/rapports": "budget",
  "/historique": null,
  "/admin": "admin",
  "/parametres": null,
};

export function moduleForHref(href: string): PermissionModule | null {
  if (HREF_MODULE[href] !== undefined) return HREF_MODULE[href];
  if (href.startsWith("/performances")) return "joueurs";
  if (href.startsWith("/stages")) return "stages";
  if (href.startsWith("/joueurs")) return "joueurs";
  if (href.startsWith("/entraineurs")) return "entraineurs";
  if (href.startsWith("/budget")) return "budget";
  if (href.startsWith("/infrastructures")) return "joueurs";
  if (href.startsWith("/materiel")) return "logistique";
  if (href.startsWith("/centre-national")) return null;
  return null;
}

export function canAccessHref(role: RoleUtilisateur, href: string): boolean {
  const mod = moduleForHref(href);
  if (mod === null) return true;
  return roleCan(role, mod);
}

export function filterNavByRole<T extends { href: string }>(
  items: T[],
  role: RoleUtilisateur
): T[] {
  return items.filter((item) => canAccessHref(role, item.href));
}
