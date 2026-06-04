import "server-only";

import type { ProgrammationEvenementEnriched, ProgrammationPdfType } from "@/lib/types/programmation-joueurs";
import { loadPdfLogoBase64 } from "@/lib/pdf/load-pdf-logo";
import {
  DEFAULT_PDF_OPTIONS,
  type ProgrammationPdfOptions,
  type ProgrammationPdfRequest,
  type ProgrammationPdfTypeLetter,
} from "@/lib/pdf/programmation/types";
import {
  generateTypeA,
  generateTypeB,
  generateTypeC,
  generateTypeD,
  generateTypeE,
} from "@/lib/pdf/programmation/generators.server";
import { formatPdfFilename } from "@/lib/pdf/programmation/formatters";
import { format, endOfMonth, endOfQuarter, startOfMonth, startOfQuarter } from "date-fns";

export type { ProgrammationPdfRequest, ProgrammationPdfOptions, ProgrammationPdfTypeLetter } from "@/lib/pdf/programmation/types";
export { DEFAULT_PDF_OPTIONS, formatPdfFilename };

/** Map anciens types vers A–E. */
export function legacyTypeToLetter(type: ProgrammationPdfType): ProgrammationPdfTypeLetter {
  switch (type) {
    case "annuel":
      return "C";
    case "multi":
      return "E";
    case "plage":
      return "A";
    case "mensuel":
    default:
      return "A";
  }
}

export function resolveOrientation(
  typePdf: ProgrammationPdfTypeLetter,
  orientation: ProgrammationPdfOptions["orientation"]
): "landscape" | "portrait" {
  if (orientation === "landscape") return "landscape";
  if (orientation === "portrait") return "portrait";
  return typePdf === "D" ? "portrait" : "landscape";
}

export async function generateProgrammationProPdf(
  request: ProgrammationPdfRequest & { evenements: ProgrammationEvenementEnriched[]; generatedBy: string }
): Promise<{ buffer: Uint8Array; filename: string }> {
  const logo = await loadPdfLogoBase64();
  const ctx = {
    evenements: request.evenements,
    joueurIds: request.joueurIds,
    dateDebut: request.dateDebut.slice(0, 10),
    dateFin: request.dateFin.slice(0, 10),
    typePdf: request.typePdf,
    options: { ...DEFAULT_PDF_OPTIONS, ...request.options },
    generatedBy: request.generatedBy,
    logoBase64: logo,
  };

  let doc;
  switch (request.typePdf) {
    case "B":
      doc = generateTypeB(ctx);
      break;
    case "C":
      doc = generateTypeC(ctx);
      break;
    case "D":
      doc = generateTypeD(ctx);
      break;
    case "E":
      doc = generateTypeE(ctx);
      break;
    case "A":
    default:
      doc = generateTypeA(ctx);
      break;
  }

  const filename = formatPdfFilename(request.typePdf, ctx.dateDebut, ctx.dateFin);
  return { buffer: new Uint8Array(doc.output("arraybuffer")), filename };
}

export function defaultProPdfDateRange(
  typePdf: ProgrammationPdfTypeLetter,
  dateDebut?: string,
  dateFin?: string
): { dateDebut: string; dateFin: string } {
  const now = new Date();
  if (dateDebut && dateFin) {
    return { dateDebut: dateDebut.slice(0, 10), dateFin: dateFin.slice(0, 10) };
  }
  if (typePdf === "C") {
    const y = now.getFullYear();
    return { dateDebut: `${y}-01-01`, dateFin: `${y}-12-31` };
  }
  if (typePdf === "B") {
    return {
      dateDebut: format(startOfQuarter(now), "yyyy-MM-dd"),
      dateFin: format(endOfQuarter(now), "yyyy-MM-dd"),
    };
  }
  return {
    dateDebut: format(startOfMonth(now), "yyyy-MM-dd"),
    dateFin: format(endOfMonth(now), "yyyy-MM-dd"),
  };
}

/** Compat GET legacy + options simplifiées. */
export async function generateFromLegacyParams(params: {
  evenements: ProgrammationEvenementEnriched[];
  joueurIds: string[];
  dateDebut: string;
  dateFin: string;
  typePdf: ProgrammationPdfType;
  generatedBy?: string;
  includeResultats?: boolean;
  includePoints?: boolean;
}): Promise<Uint8Array> {
  const letter = legacyTypeToLetter(params.typePdf);
  const { buffer } = await generateProgrammationProPdf({
    joueurIds: params.joueurIds,
    dateDebut: params.dateDebut,
    dateFin: params.dateFin,
    typePdf: letter === "A" && params.typePdf === "multi" ? "E" : letter,
    options: {
      ...DEFAULT_PDF_OPTIONS,
      inclureResultats: params.includeResultats ?? true,
      inclurePoints: params.includePoints ?? true,
    },
    evenements: params.evenements,
    generatedBy: params.generatedBy ?? "Staff FRMT",
  });
  return buffer;
}
