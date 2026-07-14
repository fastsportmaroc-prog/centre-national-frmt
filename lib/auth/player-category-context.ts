import type { AppRole } from "@/lib/types/app-roles";
import { matchesOfficialCategoryFilter, normalizeOfficialCategory } from "@/lib/constants/official-categories";
import {
  canViewJoueurCategory,
  filterJoueursByCategory,
  hasPlayerCategoryRestrictions,
  type JoueurCategoryFields,
} from "@/lib/auth/player-category-access";

export type PlayerCategoryContext = {
  allowedCategories: string[];
  bypassFilter: boolean;
  restricted: boolean;
};

/** Admin et Direction voient toutes les catégories. */
export function bypassPlayerCategoryFilter(role: AppRole, isAdmin: boolean): boolean {
  if (isAdmin) return true;
  return role === "direction";
}

export function buildPlayerCategoryContext(
  role: AppRole,
  isAdmin: boolean,
  allowedCategories: string[]
): PlayerCategoryContext {
  const bypassFilter = bypassPlayerCategoryFilter(role, isAdmin);
  const restricted = !bypassFilter && hasPlayerCategoryRestrictions(allowedCategories);
  return { allowedCategories, bypassFilter, restricted };
}

export function matchesEntityCategory(
  entityCategory: string | null | undefined,
  allowedCategories: string[],
  bypassFilter: boolean
): boolean {
  if (bypassFilter || !hasPlayerCategoryRestrictions(allowedCategories)) return true;
  const cat = entityCategory ?? "";
  return allowedCategories.some((key) => matchesOfficialCategoryFilter(key, cat));
}

export function filterByEntityCategory<T>(
  items: T[],
  getCategory: (item: T) => string | null | undefined,
  ctx: PlayerCategoryContext
): T[] {
  if (ctx.bypassFilter || !ctx.restricted) return items;
  return items.filter((item) =>
    matchesEntityCategory(getCategory(item), ctx.allowedCategories, false)
  );
}

/** Valide un paramètre catégorie URL / filtre UI — ignore les valeurs non autorisées. */
export function sanitizeCategoryParam(
  requested: string | null | undefined,
  ctx: PlayerCategoryContext
): string | undefined {
  if (ctx.bypassFilter || !ctx.restricted) {
    const v = requested?.trim();
    if (!v || v === "Toutes") return undefined;
    return normalizeOfficialCategory(v) ?? v;
  }

  const req = requested?.trim();
  if (req && req !== "Toutes") {
    const allowed = ctx.allowedCategories.some((key) =>
      matchesOfficialCategoryFilter(key, req)
    );
    if (allowed) return normalizeOfficialCategory(req) ?? req;
  }

  if (ctx.allowedCategories.length === 1) {
    return ctx.allowedCategories[0];
  }

  return undefined;
}

/** Libellé fixe pour l'UI quand la catégorie est verrouillée. */
export function lockedCategoryLabel(categories: string[]): string {
  if (!categories.length) return "";
  if (categories.length === 1) return categories[0]!;
  return categories.join(", ");
}

export function filterJoueursWithContext<T extends JoueurCategoryFields>(
  list: T[],
  ctx: PlayerCategoryContext,
  isAdmin: boolean
): T[] {
  if (ctx.bypassFilter) return list;
  return filterJoueursByCategory(list, ctx.allowedCategories, isAdmin);
}

export function canViewJoueurWithContext(
  joueur: JoueurCategoryFields,
  ctx: PlayerCategoryContext,
  isAdmin: boolean
): boolean {
  if (ctx.bypassFilter) return true;
  return canViewJoueurCategory(joueur, ctx.allowedCategories, isAdmin);
}
