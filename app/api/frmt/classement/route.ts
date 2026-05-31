import { NextResponse } from "next/server";
import {
  getFrmtClassementGroups,
  getFrmtClassementMeta,
  getFrmtClassementPlayers,
  getFrmtClassementRaw,
} from "@/lib/data/frmt-classement-data";
import { mergeFrmtClassementToSupabase } from "@/lib/data/frmt-classement-import.server";

export async function GET() {
  const file = getFrmtClassementRaw();
  const meta = getFrmtClassementMeta();
  const classementDate =
    "classementDate" in file && typeof file.classementDate === "string"
      ? file.classementDate
      : null;

  return NextResponse.json({
    ...meta,
    source: file.source,
    fetchedAt: file.fetchedAt,
    classementDate,
    note: file.note,
    groups: getFrmtClassementGroups(),
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
