import type { ProgrammationEvenementEnriched } from "@/lib/types/programmation-joueurs";

/** Types de PDF officiels FRMT (A–E). */
export type ProgrammationPdfTypeLetter = "A" | "B" | "C" | "D" | "E";

export type ProgrammationPdfLangue = "fr" | "en" | "ar";

export type ProgrammationPdfOrientation = "auto" | "landscape" | "portrait";

export type ProgrammationPdfOptions = {
  inclurePhoto: boolean;
  inclureResultats: boolean;
  inclurePoints: boolean;
  inclurePrizeMoney: boolean;
  langue: ProgrammationPdfLangue;
  orientation: ProgrammationPdfOrientation;
};

export type ProgrammationPdfRequest = {
  joueurIds: string[];
  dateDebut: string;
  dateFin: string;
  typePdf: ProgrammationPdfTypeLetter;
  options: ProgrammationPdfOptions;
};

export type ProgrammationPdfContext = {
  evenements: ProgrammationEvenementEnriched[];
  joueurIds: string[];
  dateDebut: string;
  dateFin: string;
  typePdf: ProgrammationPdfTypeLetter;
  options: ProgrammationPdfOptions;
  generatedBy: string;
  logoBase64?: string;
};

export type JoueurPdfRow = {
  id: string;
  label: string;
  categorie?: string | null;
  classement?: string | null;
  photoUrl?: string | null;
  events: ProgrammationEvenementEnriched[];
};

export const DEFAULT_PDF_OPTIONS: ProgrammationPdfOptions = {
  inclurePhoto: true,
  inclureResultats: true,
  inclurePoints: true,
  inclurePrizeMoney: true,
  langue: "fr",
  orientation: "auto",
};
