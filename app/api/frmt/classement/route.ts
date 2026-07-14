import { NextResponse } from "next/server";
import { getAuthUserFromServer } from "@/lib/auth/server-session";
import { filterFrmtClassementPlayers } from "@/lib/auth/apply-player-category-filter.server";
import { getPlayerCategoryContext } from "@/lib/auth/player-category-context.server";
import {
  getFrmtClassementMeta,
  getFrmtClassementPlayers,
  getFrmtClassementRaw,
} from "@/lib/data/frmt-classement-data";
import { groupFrmtPlayersByYearAndSexe } from "@/lib/frmt/classement-scope";
import { mergeFrmtClassementToSupabase } from "@/lib/data/frmt-classement-import.server";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getAuthUserFromServer();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const ctx = await getPlayerCategoryContext();
  const file = getFrmtClassementRaw();
  const meta = getFrmtClassementMeta();
  const classementDate =
    "classementDate" in file && typeof file.classementDate === "string"
      ? file.classementDate
      : null;

  const players = filterFrmtClassementPlayers(getFrmtClassementPlayers(), ctx);
  const groups = groupFrmtPlayersByYearAndSexe(players);

  return NextResponse.json({
    ...meta,
    total: players.length,
    garcons: players.filter((p) => p.sexe === "M").length,
    filles: players.filter((p) => p.sexe === "F").length,
    source: file.source,
    fetchedAt: file.fetchedAt,
    classementDate,
    note: file.note,
    groups,
    players,
  });
}

export async function POST() {
  const user = await getAuthUserFromServer();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  try {
    const result = await mergeFrmtClassementToSupabase();
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Import impossible" },
      { status: 500 }
    );
  }
}
