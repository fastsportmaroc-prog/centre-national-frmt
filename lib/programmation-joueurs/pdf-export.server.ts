import "server-only";

import {
  defaultProPdfDateRange,
  generateFromLegacyParams,
  generateProgrammationProPdf,
} from "@/lib/pdf/programmation/index.server";
import type {
  ProgrammationEvenementEnriched,
  ProgrammationPdfType,
} from "@/lib/types/programmation-joueurs";

export type ProgrammationPdfParams = {
  evenements: ProgrammationEvenementEnriched[];
  joueurIds: string[];
  dateDebut: string;
  dateFin: string;
  typePdf?: ProgrammationPdfType;
  generatedBy?: string;
  includeResultats?: boolean;
  includePoints?: boolean;
};

export async function generateProgrammationPdfBuffer(
  params: ProgrammationPdfParams
): Promise<Uint8Array> {
  return generateFromLegacyParams({
    evenements: params.evenements,
    joueurIds: params.joueurIds,
    dateDebut: params.dateDebut,
    dateFin: params.dateFin,
    generatedBy: params.generatedBy,
  });
}

export { generateProgrammationProPdf, defaultProPdfDateRange };

export function defaultPdfDateRange(
  _typePdf?: ProgrammationPdfType,
  dateDebut?: string,
  dateFin?: string
) {
  return defaultProPdfDateRange(dateDebut, dateFin);
}
