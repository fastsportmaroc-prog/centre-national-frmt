import { readFile } from "fs/promises";
import { join } from "path";
import { NextResponse } from "next/server";

/** Sert le logo officiel FRMT (PNG prioritaire, sinon SVG) */
export async function GET() {
  const publicDir = join(process.cwd(), "public");
  try {
    const png = await readFile(join(publicDir, "frmt-logo.png"));
    return new NextResponse(png, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
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
}
