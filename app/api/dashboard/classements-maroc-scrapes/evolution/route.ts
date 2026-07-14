import { NextResponse } from "next/server";

import {
  listCnePlayersForEvolution,
  loadClassementsMarocEvolution,
} from "@/lib/classements-maroc-scrapes/read-db.server";
import { getAuthUserFromServer } from "@/lib/auth/server-session";
import type { ClassementMarocDiscipline } from "@/lib/types/classements-maroc-scrapes";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function parseDiscipline(value: string | null): ClassementMarocDiscipline {
  return value === "double" ? "double" : "simple";
}

export async function GET(request: Request) {
  const user = await getAuthUserFromServer();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const discipline = parseDiscipline(searchParams.get("discipline"));

  if (searchParams.get("meta") === "players") {
    const players = await listCnePlayersForEvolution({ discipline });
    return NextResponse.json({ players });
  }

  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const keysRaw = searchParams.get("keys") ?? "";
  const metric = searchParams.get("metric") === "points" ? "points" : "rang";

  if (!from || !to) {
    return NextResponse.json(
      { error: "Paramètres from et to requis (YYYY-MM-DD)" },
      { status: 400 }
    );
  }

  const keys = keysRaw
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);

  const result = await loadClassementsMarocEvolution({ keys, from, to, metric });
  return NextResponse.json(result);
}
