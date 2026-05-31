import { NextResponse } from "next/server";
import { requireCompetitionApiUser } from "@/lib/competitions/auth-api";
import { listHistorique } from "@/lib/competitions/server";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Ctx) {
  const user = await requireCompetitionApiUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { id } = await params;
  const { data, error } = await listHistorique(id);
  if (error) return NextResponse.json({ error, historique: [] }, { status: 500 });
  return NextResponse.json({ historique: data });
}
