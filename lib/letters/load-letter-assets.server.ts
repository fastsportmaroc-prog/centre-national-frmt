import "server-only";

import { readFileSync, existsSync } from "fs";
import { join } from "path";

import type { LoadedFrmtLogo } from "@/lib/letters/load-logo.server";
import { loadFrmtLogoForPrint } from "@/lib/letters/load-logo.server";

export type LoadedLettreCachet = {
  base64: string;
  format: "PNG" | "JPEG";
};

const LETTERS_DIR = join(process.cwd(), "public", "letters");

function readAssetBase64(
  filenames: string[],
  format: "PNG" | "JPEG"
): LoadedLettreCachet | null {
  for (const name of filenames) {
    const path = join(LETTERS_DIR, name);
    if (!existsSync(path)) continue;
    try {
      return { base64: readFileSync(path).toString("base64"), format };
    } catch {
      /* try next */
    }
  }
  return null;
}

/** Logo en-tête (extrait du modèle Word officiel ou fallback public/). */
export function loadLettreLogoForPrint(): LoadedFrmtLogo | null {
  const fromLetters = readAssetBase64(
    ["frmt-header-logo.png", "image1.png"],
    "PNG"
  );
  if (fromLetters) return { base64: fromLetters.base64, format: "PNG" };
  return loadFrmtLogoForPrint();
}

/** Cachet / chachet institutionnel (scan du modèle Word). */
export function loadLettreCachetForPrint(): LoadedLettreCachet | null {
  return (
    readAssetBase64(["frmt-cachet.jpeg", "frmt-cachet.jpg", "image2.jpeg"], "JPEG") ??
    readAssetBase64(["frmt-cachet.png", "image3.png"], "PNG")
  );
}

export type LettrePrintAssets = {
  logo: LoadedFrmtLogo | null;
  cachet: LoadedLettreCachet | null;
};

export function loadLettrePrintAssets(): LettrePrintAssets {
  return {
    logo: loadLettreLogoForPrint(),
    cachet: loadLettreCachetForPrint(),
  };
}
