import type { Hebergement, TypeChambreHebergement } from "@/lib/types/database";
import { capaciteFromType, labelTypeChambre } from "@/lib/constants/hebergement";
import { buildNomChambre } from "@/lib/utils/hebergement";

const now = new Date().toISOString();

/** 3 pavillons × 5 chambres — types Single / Double / Triple */
const typesCycle: TypeChambreHebergement[] = [
  "single",
  "double",
  "triple",
  "double",
  "single",
];

function room(
  pavillon: number,
  numero: number,
  type: TypeChambreHebergement,
  occupe: boolean
): Hebergement {
  return {
    id: `h-p${pavillon}-c${numero}`,
    pavillon,
    numero_chambre: numero,
    nom_chambre: buildNomChambre(pavillon, numero),
    type_chambre: labelTypeChambre(type),
    type_chambre_code: type,
    capacite: capaciteFromType(type),
    occupe,
    created_at: now,
  };
}

export const seedHebergements: Hebergement[] = [];

for (let pavillon = 1; pavillon <= 3; pavillon++) {
  for (let numero = 1; numero <= 5; numero++) {
    const type = typesCycle[numero - 1]!;
    const occupe = (pavillon + numero) % 3 !== 0;
    seedHebergements.push(room(pavillon, numero, type, occupe));
  }
}
