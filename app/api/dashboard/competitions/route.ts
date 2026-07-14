import { NextResponse } from "next/server";
import { getAuthUserFromServer } from "@/lib/auth/server-session";
import { getCompetitionDashboardSummary } from "@/lib/competitions/dashboard-summary.server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Résumé compétitions pour le tableau de bord Direction (utilisateur connecté). */
export async function GET() {
  const user = await getAuthUserFromServer();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const summary = await getCompetitionDashboardSummary();
  if (summary.error) {
    return NextResponse.json(summary, { status: 500 });
  }

  return NextResponse.json(summary);
}
