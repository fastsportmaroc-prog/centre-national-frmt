import type {
  StatutBesoinRestauration,
  StatutFactureRestauration,
  TypeEvenementRestauration,
} from "@/lib/types/restauration";

export const TYPES_EVENEMENT: { value: TypeEvenementRestauration; label: string }[] = [
  { value: "tournoi", label: "Tournoi" },
  { value: "stage", label: "Stage" },
  { value: "repas_equipe", label: "Repas équipe" },
  { value: "evenement_officiel", label: "Événement officiel" },
  { value: "autre", label: "Autre" },
];

export const TYPES_REPAS = [
  { value: "petit_dejeuner", label: "Petit-déjeuner" },
  { value: "dejeuner", label: "Déjeuner" },
  { value: "diner", label: "Dîner" },
  { value: "collation", label: "Collation" },
  { value: "buffet", label: "Buffet" },
];

export const STATUTS_BESOIN: { value: StatutBesoinRestauration; label: string }[] = [
  { value: "brouillon", label: "Brouillon" },
  { value: "planifie", label: "Planifié" },
  { value: "commande", label: "Commandé" },
  { value: "livre", label: "Livré" },
  { value: "facture", label: "Facturé" },
  { value: "paye", label: "Payé" },
  { value: "annule", label: "Annulé" },
];

export const STATUTS_FACTURE: { value: StatutFactureRestauration; label: string }[] = [
  { value: "brouillon", label: "Brouillon" },
  { value: "emise", label: "Émise" },
  { value: "en_attente_paiement", label: "En attente paiement" },
  { value: "payee", label: "Payée" },
  { value: "litige", label: "Litige" },
  { value: "annulee", label: "Annulée" },
];

export const BESOINS_EN_COURS: StatutBesoinRestauration[] = [
  "planifie",
  "commande",
  "livre",
  "facture",
];

export const FACTURES_IMPAYEES: StatutFactureRestauration[] = [
  "emise",
  "en_attente_paiement",
  "litige",
];
