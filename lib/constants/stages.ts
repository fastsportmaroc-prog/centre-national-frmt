export const SOURCES_STAGE = [
  "FRMT",
  "FFT",
  "ITF",
  "ATP",
  "WTA",
  "ITF Junior",
  "Futures",
  "Autre",
] as const;

import { categoryCodes, getDefaultAgeCategories } from "@/lib/v2/categories-age-store";

/** Liste par défaut (stages / filtres) — synchronisée avec les catégories d'âge configurables. */
export const CATEGORIES_STAGE = categoryCodes(getDefaultAgeCategories()) as readonly string[];
