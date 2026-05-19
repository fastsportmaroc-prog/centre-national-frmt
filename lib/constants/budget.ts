import type { CategorieBudget } from "@/lib/types/budget";

export const CATEGORIES_BUDGET: { value: CategorieBudget; label: string }[] = [
  { value: "stages", label: "Stages & programme" },
  { value: "voyages", label: "Voyages & billets" },
  { value: "hebergement", label: "Hébergement" },
  { value: "restauration", label: "Restauration" },
  { value: "equipement", label: "Équipement" },
  { value: "total", label: "Total général" },
];

export const BUDGET_ANNEE_DEFAUT = 2026;
