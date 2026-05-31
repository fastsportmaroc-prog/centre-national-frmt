import {
  categorieCodeFromAge,
  categorieCodeFromJoueur,
  calculerAgeCategorie,
  getAgeCategories,
  getDefaultAgeCategories,
} from "@/lib/v2/categories-age-store";
import { normalizeOfficialCategory, resolveOfficialCategory } from "@/lib/constants/official-categories";
import { differenceInYears, parseISO } from "date-fns";

export function calculerAge(dateNaissance: string): number {
  try {
    return differenceInYears(new Date(), parseISO(dateNaissance));
  } catch {
    return 0;
  }
}

export { calculerAgeCategorie };

/** Catégorie UN déduite de la date de naissance (11 ans → U12, 13 → U14, …). */
export function categorieDepuisNaissance(dateNaissance: string): string {
  const categories =
    typeof window !== "undefined" ? getAgeCategories() : getDefaultAgeCategories();
  return categorieCodeFromAge(calculerAgeCategorie(dateNaissance), categories);
}

/** Alias explicite pour les formulaires joueurs. */
export function categorieUnDepuisNaissance(dateNaissance: string): string {
  return categorieCodeFromJoueur(dateNaissance);
}

export function nomComplet(prenom: string, nom: string): string {
  return `${prenom} ${nom}`.trim();
}

/** Catégorie affichée : priorité à la valeur enregistrée (manuelle), sinon déduction par naissance. */
export function getJoueurDisplayCategorie(
  j: {
    date_naissance?: string | null;
    categorie_age?: string | null;
    categorie?: string | null;
  },
  fallback = "U18"
): string {
  const stored = (j.categorie_age ?? j.categorie ?? "").trim();
  const normalized = normalizeOfficialCategory(stored);
  if (normalized) return normalized;
  const fromBirth = j.date_naissance ? categorieDepuisNaissance(j.date_naissance) : null;
  return resolveOfficialCategory(stored, fromBirth ?? fallback);
}
