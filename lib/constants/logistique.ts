import type {
  StatutDemandeLogistique,
  TypeDemandeLogistique,
} from "@/lib/types/logistique";

export const TYPES_DEMANDE: { value: TypeDemandeLogistique; label: string }[] = [
  { value: "billet_avion", label: "Billet d'avion" },
  { value: "hotel", label: "Hôtel" },
  { value: "transport", label: "Transport" },
  { value: "restauration", label: "Restauration" },
  { value: "equipement", label: "Équipement" },
  { value: "deplacement_competition", label: "Déplacement compétition" },
  { value: "stage", label: "Stage" },
  { value: "mission", label: "Mission" },
];

export const STATUTS_DEMANDE: { value: StatutDemandeLogistique; label: string }[] = [
  { value: "brouillon", label: "Brouillon" },
  { value: "en_attente", label: "En attente" },
  { value: "validee_direction", label: "Validée direction" },
  { value: "validee_logistique", label: "Validée logistique" },
  { value: "refusee", label: "Refusée" },
  { value: "envoyee", label: "Envoyée" },
  { value: "traitee", label: "Traitée" },
];

export const AGENCE_VOYAGE_DEFAUT = "Agence Voyages Tennis Pro — contact@agence-tennis.fr";
