import { NextResponse } from "next/server";
import { requireCompetitionApiUser } from "@/lib/competitions/auth-api";
import { listCompetitionBilletsHub } from "@/lib/competitions/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await requireCompetitionApiUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { data, factures, error } = await listCompetitionBilletsHub();
  if (error) return NextResponse.json({ error, billets: data, factures }, { status: 500 });
  return NextResponse.json({ billets: data, factures });
}
