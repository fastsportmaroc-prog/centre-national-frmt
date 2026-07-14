import { NextResponse } from "next/server";
import { runSyncClassementsServer } from "@/lib/classements-externes/sync-classements.server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Dev uniquement — lance la sync sans session (diagnostic local). */
export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false, error: "Non disponible" }, { status: 404 });
  }

  let mode: "cache" | "rankings" | "api" = "cache";
  try {
    const body = (await request.json().catch(() => null)) as { mode?: string } | null;
    if (body?.mode === "rankings" || body?.mode === "api") mode = body.mode;
  } catch {
    /* ignore */
  }

  const result = await runSyncClassementsServer(mode);
  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}
