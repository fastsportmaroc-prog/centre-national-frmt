import type { AppRole } from "@/lib/types/app-roles";
import { bypassPlayerCategoryFilter } from "@/lib/auth/player-category-context";
import { matchesJoueurCategoryFilter } from "@/lib/utils/joueur";

export type JoueurCategoryFields = {
  date_naissance?: string | null;
  categorie_age?: string | null;
  categorie?: string | null;
};

/** `null` ou tableau vide = aucune restriction (toutes catégories). */
export function hasPlayerCategoryRestrictions(allowed: string[] | null | undefined): boolean {
  return Array.isArray(allowed) && allowed.length > 0;
}

export function canViewJoueurCategory(
  joueur: JoueurCategoryFields,
  allowedCategories: string[] | null | undefined,
  bypass: boolean
): boolean {
  if (bypass) return true;
  if (!hasPlayerCategoryRestrictions(allowedCategories)) return true;
  return allowedCategories!.some((cat) => matchesJoueurCategoryFilter(joueur, cat));
}

export function filterJoueursByCategory<T extends JoueurCategoryFields>(
  joueurs: T[],
  allowedCategories: string[] | null | undefined,
  bypass: boolean
): T[] {
  if (bypass || !hasPlayerCategoryRestrictions(allowedCategories)) return joueurs;
  return joueurs.filter((j) => canViewJoueurCategory(j, allowedCategories, false));
}

/** @deprecated Préférer bypassPlayerCategoryFilter(role, isAdmin) */
export function joueurCategoryBypass(isAdmin: boolean, role?: AppRole): boolean {
  if (role) return bypassPlayerCategoryFilter(role, isAdmin);
  return isAdmin;
}
