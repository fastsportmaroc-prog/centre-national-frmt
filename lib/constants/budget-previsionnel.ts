import type { StatutBudgetPrevisionnel, TypeBudgetPrevisionnel } from "@/lib/types/budget-previsionnel";

export const TAUX_MAD_DEFAUT = 10.8;
export const DEVISE_BUDGET_DEFAUT = "EUR";

export const TYPES_BUDGET: { value: TypeBudgetPrevisionnel; label: string }[] = [
  { value: "joueur", label: "Joueur" },
  { value: "equipe", label: "Équipe" },
  { value: "stage", label: "Stage" },
  { value: "tournoi", label: "Tournoi" },
  { value: "mission", label: "Mission" },
];

export const STATUTS_BUDGET: { value: StatutBudgetPrevisionnel; label: string }[] = [
  { value: "brouillon", label: "Brouillon" },
  { value: "valide", label: "Validé" },
  { value: "envoye", label: "Envoyé" },
  { value: "paye", label: "Payé" },
  { value: "archive", label: "Archivé" },
];

export const BUDGET_LIGNE_CATEGORIES = [
  "Hébergement",
  "Restauration",
  "Transport aérien",
  "Transport terrestre",
  "Frais d'inscription",
  "Argent de poche",
  "Équipement / Matériel",
  "Frais médicaux",
  "Frais de visa",
  "Divers",
] as const;

/** Valeur du select pour activer la saisie libre du nom de ligne */
export const BUDGET_CATEGORY_CUSTOM = "__custom__";

export function isPresetBudgetCategory(designation: string): boolean {
  return (BUDGET_LIGNE_CATEGORIES as readonly string[]).includes(designation);
}

export const TAUX_MAD_STORAGE_KEY = "frmt-budget-taux-eur-mad";

export const LIGNES_BUDGET_PRESETS: { designation: string; description?: string }[] = [
  { designation: "Hébergement" },
  { designation: "Restauration" },
  { designation: "Transfert aéroport-hôtel aller-retour" },
  { designation: "Frais d'inscription tournoi" },
  { designation: "Argent de poche coach" },
  { designation: "Billet avion" },
  { designation: "Transport local" },
  { designation: "Kiné / médical" },
  { designation: "Matériel" },
  { designation: "Autres frais" },
];

/**
 * Signataires officiels FRMT — utilisés uniquement pour le PDF imprimable.
 * Non exposés dans le formulaire ; le taux EUR/MAD reste saisi manuellement.
 */
export const SIGNATAIRES_PDF_OFFICIELS: { poste: string; nom: string; ordre: number }[] = [
  {
    poste: "Directeur Technique National",
    nom: "KHALID AFIF",
    ordre: 0,
  },
  {
    poste: "Responsable de la Commission de Développement et du Haut Niveau",
    nom: "CHAFIK SADER",
    ordre: 1,
  },
];

/** @deprecated alias — préférer SIGNATAIRES_PDF_OFFICIELS */
export const SIGNATAIRES_DEFAUT = SIGNATAIRES_PDF_OFFICIELS;

/** Métadonnées persistées (mêmes noms que le PDF) — jamais éditables en UI. */
export function signatairesOfficielsInput() {
  return SIGNATAIRES_PDF_OFFICIELS.map((s) => ({
    poste: s.poste,
    nom: s.nom,
    ordre: s.ordre,
  }));
}
