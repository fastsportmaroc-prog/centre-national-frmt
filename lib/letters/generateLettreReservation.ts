import { buildLetterContent } from "@/lib/letters/letter-content";
import { generateLettreDocx } from "@/lib/letters/letter-docx";
import { generateLettrePdf } from "@/lib/letters/letter-pdf";
import { buildLettreFilenameBase } from "@/lib/letters/letter-filename";
import type { GenerateLettreResult, LettreReservationInput } from "@/lib/letters/letter-types";
import type { LoadedLettreCachet } from "@/lib/letters/load-letter-assets.server";

function toBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
  return btoa(binary);
}

export type LettreGenerationAssets = {
  logoBase64?: string | null;
  logoFormat?: "PNG" | "SVG";
  cachet?: LoadedLettreCachet | null;
};

/** Génère PDF + Word pour la lettre officielle de réservation FRMT. */
export async function generateLettreReservation(
  input: LettreReservationInput,
  assets?: LettreGenerationAssets
): Promise<GenerateLettreResult> {
  const content = buildLetterContent(input);
  const logoBase64 = assets?.logoBase64 ?? input.logoBase64 ?? null;
  const logoFormat = assets?.logoFormat ?? input.logoFormat ?? "PNG";
  const cachet = assets?.cachet ?? null;
  const logoBuffer =
    logoBase64 && logoFormat === "PNG" && typeof Buffer !== "undefined"
      ? Buffer.from(logoBase64, "base64")
      : null;
  const cachetBuffer =
    cachet?.base64 && typeof Buffer !== "undefined"
      ? Buffer.from(cachet.base64, "base64")
      : null;

  const pdf = generateLettrePdf(
    content,
    logoBase64,
    logoFormat,
    cachet?.base64 ?? null,
    cachet?.format ?? "JPEG"
  );
  const docx = await generateLettreDocx(content, logoBuffer, cachetBuffer, cachet?.format ?? "JPEG");

  const filenameBase = buildLettreFilenameBase(input.stage.stage_action, input.stage.date_debut);

  return {
    pdf,
    docx,
    pdfBase64: toBase64(pdf),
    docxBase64: toBase64(docx),
    filenameBase,
    content,
  };
}

/** Alias (nom demandé dans la spec). */
export const generateLettrReservation = generateLettreReservation;
