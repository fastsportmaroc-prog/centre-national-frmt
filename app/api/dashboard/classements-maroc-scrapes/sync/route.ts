import { NextResponse } from "next/server";

import { runWeeklyMarocScrape } from "@/lib/classements-maroc-scrapes/run-weekly-scrape.server";
import { getAuthUserFromServer } from "@/lib/auth/server-session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

/** Déclenchement manuel du scrape ATP/WTA (admin / dev). */
export async function POST(request: Request) {
  const user = await getAuthUserFromServer();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  let force = false;
  try {
    const body = (await request.json().catch(() => null)) as { force?: boolean } | null;
    force = Boolean(body?.force);
  } catch {
    /* default */
  }

  const result = await runWeeklyMarocScrape({ force });
  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}
