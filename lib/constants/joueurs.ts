import type { CategorieAge, SexeJoueur, StatutJoueur } from "@/lib/types/database";

export const SEXES_JOUEUR: { value: SexeJoueur; label: string; short: string }[] = [
  { value: "M", label: "Garçons", short: "G" },
  { value: "F", label: "Filles", short: "F" },
  { value: "Autre", label: "Autre", short: "—" },
];

export function sexeJoueurLabel(sexe: SexeJoueur): string {
  return SEXES_JOUEUR.find((s) => s.value === sexe)?.label ?? sexe;
}

export const CATEGORIES_AGE: CategorieAge[] = [
  "U8",
  "U10",
  "U12",
  "U14",
  "U16",
  "U18",
  "Senior",
];

export const STATUTS_JOUEUR: { value: StatutJoueur; label: string }[] = [
  { value: "actif", label: "Actif" },
  { value: "blesse", label: "Blessé" },
  { value: "absent", label: "Absent" },
  { value: "suspendu", label: "Suspendu" },
];

export const NIVEAUX = ["Pro", "Élite", "National", "Espoir", "Régional", "Loisir"];

export const GROUPES_PREDEFINIS = [
  "Élite",
  "Développement",
  "U18",
  "U16",
  "U14",
  "U12",
  "Loisir",
  "Préparation compétition",
] as const;

export const SURFACES_COURT = [
  "Terre battue",
  "Dur",
  "Gazon",
  "Synthétique",
] as const;

export const STATUTS_COURT = [
  { value: "disponible" as const, label: "Disponible" },
  { value: "occupe" as const, label: "Occupé" },
  { value: "maintenance" as const, label: "Maintenance" },
  { value: "ferme" as const, label: "Fermé" },
];

export const STATUTS_RESERVATION = [
  { value: "confirmee" as const, label: "Confirmée" },
  { value: "en_attente" as const, label: "En attente" },
  { value: "annulee" as const, label: "Annulée" },
  { value: "terminee" as const, label: "Terminée" },
];
