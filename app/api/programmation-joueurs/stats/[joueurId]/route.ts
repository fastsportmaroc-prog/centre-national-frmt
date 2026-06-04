import { NextResponse } from "next/server";
import { requireProgrammationApiUser } from "@/lib/programmation-joueurs/auth-api";
import { getProgrammationJoueurStats } from "@/lib/programmation-joueurs/server";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ joueurId: string }> };

export async function GET(request: Request, { params }: Ctx) {
  const user = await requireProgrammationApiUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { joueurId } = await params;
  const { searchParams } = new URL(request.url);
  const anneeRaw = searchParams.get("annee");
  const annee = anneeRaw ? Number(anneeRaw) : undefined;

  const { data, error } = await getProgrammationJoueurStats(joueurId, annee);
  if (error) return NextResponse.json({ error, stats: data }, { status: 500 });
  return NextResponse.json({ stats: data });
}
