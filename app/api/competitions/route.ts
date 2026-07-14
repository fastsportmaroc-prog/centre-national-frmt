import { NextResponse } from "next/server";
import { requireCompetitionApiUser } from "@/lib/competitions/auth-api";
import {
  canAccessCompetitionCategory,
  filterCompetitionsByCategory,
} from "@/lib/auth/apply-player-category-filter.server";
import { getPlayerCategoryContext } from "@/lib/auth/player-category-context.server";
import { createCompetition, listCompetitions } from "@/lib/competitions/server";
import type { CompetitionInput } from "@/lib/types/competition";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await requireCompetitionApiUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const ctx = await getPlayerCategoryContext();
  const { data, error } = await listCompetitions();
  if (error) return NextResponse.json({ error, competitions: [] }, { status: 500 });
  return NextResponse.json({ competitions: filterCompetitionsByCategory(data, ctx) });
}

export async function POST(request: Request) {
  const user = await requireCompetitionApiUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const body = (await request.json()) as CompetitionInput;
  const { data, error, warning } = await createCompetition(body, user.id);
  if (error) return NextResponse.json({ error }, { status: 500 });
  return NextResponse.json({ competition: data, warning: warning ?? null });
}
