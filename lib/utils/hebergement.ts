import {
  capaciteFromType,
  labelTypeChambre,
} from "@/lib/constants/hebergement";
import type {
  Hebergement,
  HebergementInput,
  TypeChambreHebergement,
} from "@/lib/types/database";

export function buildNomChambre(pavillon: number, numero: number): string {
  return `Pavillon ${pavillon} — Chambre ${numero}`;
}

export function normalizeHebergementInput(
  input: HebergementInput
): HebergementInput {
  const code = input.type_chambre_code;
  const capacite = capaciteFromType(code);
  const nom_chambre = buildNomChambre(input.pavillon, input.numero_chambre);
  return {
    ...input,
    nom_chambre,
    type_chambre: labelTypeChambre(code),
    type_chambre_code: code,
    capacite,
  };
}

export function groupHebergementsByPavillon(
  items: Hebergement[]
): Map<number, Hebergement[]> {
  const map = new Map<number, Hebergement[]>();
  for (const h of items) {
    const list = map.get(h.pavillon) ?? [];
    list.push(h);
    map.set(h.pavillon, list);
  }
  for (const [, list] of map) {
    list.sort((a, b) => a.numero_chambre - b.numero_chambre);
  }
  return map;
}

export function parseTypeChambreFromLegacy(
  type: string,
  capacite: number
): TypeChambreHebergement {
  const t = type.toLowerCase();
  if (t.includes("triple") || capacite >= 3) return "triple";
  if (t.includes("double") || capacite === 2) return "double";
  return "single";
}
