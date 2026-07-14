import { NextResponse } from "next/server";

import {
  loadClassementsMarocScrapes,
  loadPlayerHistory,
} from "@/lib/classements-maroc-scrapes/read-db.server";
import {
  isSourcePlayerId,
  parsePlayerHistoryKey,
} from "@/lib/classements-maroc-scrapes/player-key";
import { getAuthUserFromServer } from "@/lib/auth/server-session";
import type {
  ClassementMarocCategorie,
  ClassementMarocDiscipline,
} from "@/lib/types/classements-maroc-scrapes";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function parseType(value: string | null): ClassementMarocCategorie {
  if (value === "ATP" || value === "WTA") return value;
  return "all";
}

function parseDiscipline(value: string | null): ClassementMarocDiscipline {
  return value === "double" ? "double" : "simple";
}

export async function GET(request: Request) {
  const user = await getAuthUserFromServer();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);

  // Historique lazy d'un joueur : ?historyKey=WTA:simple:330733
  const historyKey = searchParams.get("historyKey");
  if (historyKey) {
    const parsed = parsePlayerHistoryKey(historyKey);
    if (!parsed) {
      return NextResponse.json({ historique: [] });
    }
    const historique = await loadPlayerHistory({
      type: parsed.type,
      discipline: parsed.discipline,
      sourcePlayerId: isSourcePlayerId(parsed.idOrName) ? parsed.idOrName : null,
      nomJoueur: isSourcePlayerId(parsed.idOrName) ? undefined : parsed.idOrName,
    });
    return NextResponse.json({ historique });
  }

  const semaine = searchParams.get("semaine");
  const asOf = searchParams.get("asOf");
  const type = parseType(searchParams.get("type"));
  const discipline = parseDiscipline(searchParams.get("discipline"));

  const result = await loadClassementsMarocScrapes({
    semaine,
    asOf,
    type,
    discipline,
  });

  return NextResponse.json(result);
}
