import { NextResponse } from "next/server";
import { runWeeklyMarocScrape } from "@/lib/classements-maroc-scrapes/run-weekly-scrape.server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

/** Dev uniquement — scrape ATP/WTA sans session. */
export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false, error: "Non disponible" }, { status: 404 });
  }

  let force = false;
  try {
    const body = (await request.json().catch(() => null)) as { force?: boolean } | null;
    force = Boolean(body?.force);
  } catch {
    /* ignore */
  }

  const result = await runWeeklyMarocScrape({ force });
  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}
