import "server-only";

import { readFileSync } from "fs";
import { join } from "path";

export type LoadedFrmtLogo = {
  base64: string;
  format: "PNG" | "SVG";
};

export function loadFrmtLogoForPrint(): LoadedFrmtLogo | null {
  try {
    const pngPath = join(process.cwd(), "public", "logo-frmt.png");
    return { base64: readFileSync(pngPath).toString("base64"), format: "PNG" };
  } catch {
    try {
      const pngPath = join(process.cwd(), "public", "frmt-logo.png");
      return { base64: readFileSync(pngPath).toString("base64"), format: "PNG" };
    } catch {
      try {
        const svgPath = join(process.cwd(), "public", "frmt-logo.svg");
        return {
          base64: Buffer.from(readFileSync(svgPath, "utf-8"), "utf-8").toString("base64"),
          format: "SVG",
        };
      } catch {
        return null;
      }
    }
  }
}

export function loadFrmtLogoBase64(): string | null {
  return loadFrmtLogoForPrint()?.base64 ?? null;
}
