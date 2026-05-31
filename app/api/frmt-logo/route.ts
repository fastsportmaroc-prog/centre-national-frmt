import { readFile } from "fs/promises";
import { join } from "path";
import { NextResponse } from "next/server";

/** Sert le logo officiel FRMT (PNG prioritaire pour impression/PDF fiables). */
export async function GET() {
  const publicDir = join(process.cwd(), "public");
  const pngCandidates = ["logo-frmt.png", "frmt-logo.png"];
  for (const name of pngCandidates) {
    try {
      const png = await readFile(join(publicDir, name));
      return new NextResponse(png, {
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "public, max-age=86400",
        },
      });
    } catch {
      /* essai suivant */
    }
  }
  try {
    const svg = await readFile(join(publicDir, "frmt-logo.svg"), "utf-8");
    return new NextResponse(svg, {
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return NextResponse.json({ error: "Logo FRMT introuvable" }, { status: 404 });
  }
}
