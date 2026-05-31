import { NextResponse } from "next/server";
import { requireCompetitionApiUser } from "@/lib/competitions/auth-api";
import { getCompetitionDashboardSummary } from "@/lib/competitions/dashboard-summary.server";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await requireCompetitionApiUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const summary = await getCompetitionDashboardSummary();
  if (summary.error) {
    return NextResponse.json(summary, { status: 500 });
  }
  return NextResponse.json(summary);
}
