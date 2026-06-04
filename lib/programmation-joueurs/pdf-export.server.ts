import "server-only";

import {
  defaultProPdfDateRange,
  generateFromLegacyParams,
  generateProgrammationProPdf,
  legacyTypeToLetter,
} from "@/lib/pdf/programmation/index.server";
import type { ProgrammationPdfRequest } from "@/lib/pdf/programmation/types";
import type {
  ProgrammationEvenementEnriched,
  ProgrammationPdfType,
} from "@/lib/types/programmation-joueurs";

export type ProgrammationPdfParams = {
  evenements: ProgrammationEvenementEnriched[];
  joueurIds: string[];
  dateDebut: string;
  dateFin: string;
  typePdf: ProgrammationPdfType;
  generatedBy?: string;
  includeResultats?: boolean;
  includePoints?: boolean;
  includeClassement?: boolean;
};

export async function generateProgrammationPdfBuffer(
  params: ProgrammationPdfParams
): Promise<Uint8Array> {
  return generateFromLegacyParams({
    evenements: params.evenements,
    joueurIds: params.joueurIds,
    dateDebut: params.dateDebut,
    dateFin: params.dateFin,
    typePdf: params.typePdf,
    generatedBy: params.generatedBy,
    includeResultats: params.includeResultats,
    includePoints: params.includePoints,
  });
}

export { generateProgrammationProPdf, defaultProPdfDateRange, legacyTypeToLetter };
export type { ProgrammationPdfRequest };

export function defaultPdfDateRange(typePdf: ProgrammationPdfType, dateDebut?: string, dateFin?: string) {
  const letter = legacyTypeToLetter(typePdf);
  return defaultProPdfDateRange(letter, dateDebut, dateFin);
}
