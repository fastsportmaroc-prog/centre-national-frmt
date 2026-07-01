import "server-only";

import type { ProgrammationEvenementEnriched, ProgrammationPdfType } from "@/lib/types/programmation-joueurs";
import { loadPdfLogoBase64 } from "@/lib/pdf/load-pdf-logo";
import {
  DEFAULT_PDF_OPTIONS,
  type ProgrammationPdfOptions,
  type ProgrammationPdfRequest,
} from "@/lib/pdf/programmation/types";
import { generateDeplacementsPdf } from "@/lib/pdf/programmation/generators.server";
import { formatDeplacementsFilename } from "@/lib/pdf/programmation/formatters";
import { format, endOfMonth, startOfMonth } from "date-fns";

export type { ProgrammationPdfRequest, ProgrammationPdfOptions } from "@/lib/pdf/programmation/types";
export { DEFAULT_PDF_OPTIONS, formatDeplacementsFilename };

export function defaultProPdfDateRange(
  dateDebut?: string,
  dateFin?: string
): { dateDebut: string; dateFin: string } {
  const now = new Date();
  if (dateDebut && dateFin) {
    return { dateDebut: dateDebut.slice(0, 10), dateFin: dateFin.slice(0, 10) };
  }
  return {
    dateDebut: format(startOfMonth(now), "yyyy-MM-dd"),
    dateFin: format(endOfMonth(now), "yyyy-MM-dd"),
  };
}

export async function generateProgrammationProPdf(params: {
  joueurIds: string[];
  dateDebut: string;
  dateFin: string;
  options?: Partial<ProgrammationPdfOptions>;
  evenements: ProgrammationEvenementEnriched[];
  generatedBy: string;
}): Promise<{ buffer: Uint8Array; filename: string }> {
  const logo = await loadPdfLogoBase64();
  const ctx = {
    evenements: params.evenements,
    joueurIds: params.joueurIds,
    dateDebut: params.dateDebut.slice(0, 10),
    dateFin: params.dateFin.slice(0, 10),
    typePdf: "A" as const,
    options: { ...DEFAULT_PDF_OPTIONS, ...params.options },
    generatedBy: params.generatedBy,
    logoBase64: logo,
  };

  const doc = generateDeplacementsPdf(ctx);
  const filename = formatDeplacementsFilename(ctx.dateDebut, ctx.dateFin);
  return { buffer: new Uint8Array(doc.output("arraybuffer")), filename };
}

/** Compat GET legacy. */
export async function generateFromLegacyParams(params: {
  evenements: ProgrammationEvenementEnriched[];
  joueurIds: string[];
  dateDebut: string;
  dateFin: string;
  typePdf?: ProgrammationPdfType;
  generatedBy?: string;
}): Promise<Uint8Array> {
  const { buffer } = await generateProgrammationProPdf({
    joueurIds: params.joueurIds,
    dateDebut: params.dateDebut,
    dateFin: params.dateFin,
    evenements: params.evenements,
    generatedBy: params.generatedBy ?? "Staff FRMT",
  });
  return buffer;
}

/** @deprecated Toujours tableau déplacements — conservé pour compat API. */
export function legacyTypeToLetter(_type: ProgrammationPdfType): "A" {
  return "A";
}
