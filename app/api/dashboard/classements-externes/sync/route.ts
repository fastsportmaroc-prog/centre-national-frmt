import { NextResponse } from "next/server";
import { getAuthUserFromServer } from "@/lib/auth/server-session";
import {
  runSyncClassementsServer,
  type SyncMode,
} from "@/lib/classements-externes/sync-classements.server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function parseMode(value: unknown): SyncMode {
  if (value === "cache" || value === "rankings" || value === "api") return value;
  return "cache";
}

/** Sync classements : mode cache (0 appel), rankings (2 appels), api (recherche complète). */
export async function POST(request: Request) {
  const user = await getAuthUserFromServer();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  let mode: SyncMode = "cache";
  try {
    const body = (await request.json().catch(() => null)) as { mode?: unknown } | null;
    if (body?.mode) mode = parseMode(body.mode);
  } catch {
    /* default cache */
  }

  const fallback = await runSyncClassementsServer(mode);
  if (!fallback.ok && fallback.error && (fallback.synchronises ?? 0) === 0) {
    return NextResponse.json(
      {
        ...fallback,
        hint:
          mode === "cache"
            ? "Cache vide — lancez d'abord « Màj ATP/WTA » (2 appels API / jour)."
            : "Quota API ou parsing — vérifiez RAPIDAPI_HOST=tennisapi1.p.rapidapi.com",
        syncMeta: {
          lastSyncAt: fallback.last_sync_at ?? null,
          linesLastSync: fallback.lignes_traitees ?? fallback.traites ?? 0,
        },
      },
      { status: mode === "cache" ? 200 : 502 }
    );
  }

  return NextResponse.json(
    {
      ...fallback,
      syncMeta: {
        lastSyncAt: fallback.last_sync_at ?? null,
        linesLastSync: fallback.lignes_traitees ?? fallback.traites ?? 0,
      },
    },
    {
      status: fallback.ok ? 200 : (fallback.synchronises ?? 0) > 0 ? 207 : 502,
    }
  );
}
