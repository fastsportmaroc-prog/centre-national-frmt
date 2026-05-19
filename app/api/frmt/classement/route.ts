import { NextResponse } from "next/server";
import { getFrmtClassementRaw, getFrmtClassementPlayers } from "@/lib/data/frmt-classement";
import { mergeFrmtClassementToSupabase } from "@/lib/data/frmt-classement-import.server";

export async function GET() {
  const file = getFrmtClassementRaw();
  return NextResponse.json({
    source: file.source,
    fetchedAt: file.fetchedAt,
    note: file.note,
    count: file.players?.length ?? 0,
    players: getFrmtClassementPlayers(),
  });
}

export async function POST() {
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
