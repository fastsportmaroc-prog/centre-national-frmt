import type { CategorieLigneBudget } from "@/lib/types/budget-deplacement";

export const CATEGORIE_LIGNE_BUDGET_LABELS: Record<CategorieLigneBudget, string> = {
  billet_avion_joueur: "Billet avion — joueur",
  billet_avion_coach: "Billet avion — coach",
  hotel_joueur: "Hôtel — joueur",
  hotel_coach: "Hôtel — coach",
  restauration: "Restauration",
  argent_de_poche: "Argent de poche",
  transport_local: "Transport local",
  inscription_tournoi: "Inscription tournoi",
  cordage: "Cordage",
  materiel: "Matériel",
  visa: "Visa",
  assurance: "Assurance",
  kine_medical: "Kiné / médical",
  autres_frais: "Autres frais",
};

/** Lignes imputées au coach (déplacements équipe / encadrement) */
export const CATEGORIES_BUDGET_COACH: CategorieLigneBudget[] = [
  "billet_avion_coach",
  "hotel_coach",
];
