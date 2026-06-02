import { getOfficialLogoDataUri } from "@/lib/brand/print-logo";

/** Logo FRMT pour en-têtes PDF (même source que l’existant). */
export async function loadPdfLogoBase64(): Promise<string | undefined> {
  try {
    const uri = getOfficialLogoDataUri();
    if (!uri?.startsWith("data:")) return undefined;
    return uri;
  } catch {
    return undefined;
  }
}
