import type { TypeChambreHebergement } from "@/lib/types/database";

export const PAVILLONS = [1, 2, 3] as const;
export const CHAMBRES_PAR_PAVILLON = 5;

export const TYPES_CHAMBRE: {
  value: TypeChambreHebergement;
  label: string;
  capacite: number;
}[] = [
  { value: "single", label: "Simple", capacite: 1 },
  { value: "double", label: "Double", capacite: 2 },
  { value: "triple", label: "Triple", capacite: 3 },
];

export function capaciteFromType(type: TypeChambreHebergement): number {
  return TYPES_CHAMBRE.find((t) => t.value === type)?.capacite ?? 1;
}

export function labelTypeChambre(type: TypeChambreHebergement): string {
  return TYPES_CHAMBRE.find((t) => t.value === type)?.label ?? type;
}
