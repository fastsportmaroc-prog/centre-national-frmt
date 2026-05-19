import type { CategorieAge } from "@/lib/types/database";
import { differenceInYears, parseISO } from "date-fns";

export function calculerAge(dateNaissance: string): number {
  try {
    return differenceInYears(new Date(), parseISO(dateNaissance));
  } catch {
    return 0;
  }
}

/** Catégorie d'âge déduite de la date de naissance (règles fédérales simplifiées). */
export function categorieDepuisNaissance(dateNaissance: string): CategorieAge {
  const age = calculerAge(dateNaissance);
  if (age < 8) return "U8";
  if (age < 10) return "U10";
  if (age < 12) return "U12";
  if (age < 14) return "U14";
  if (age < 16) return "U16";
  if (age < 18) return "U18";
  return "Senior";
}

export function nomComplet(prenom: string, nom: string): string {
  return `${prenom} ${nom}`.trim();
}
