import { NextResponse } from "next/server";
import { requireCompetitionApiUser } from "@/lib/competitions/auth-api";
import {
  getCompetitionBilletFacture,
  getCompetitionBilletTarif,
  upsertCompetitionBilletFacture,
} from "@/lib/competitions/server";
import type { CompetitionBilletFacture } from "@/lib/types/competition";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Ctx) {
  const user = await requireCompetitionApiUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { id } = await params;
  const [facture, tarif] = await Promise.all([
    getCompetitionBilletFacture(id),
    getCompetitionBilletTarif(id),
  ]);
  if (facture.error && !facture.data) {
    return NextResponse.json({ error: facture.error, facture: null, tarif }, { status: 500 });
  }
  return NextResponse.json({ facture: facture.data, tarif });
}

export async function PUT(request: Request, { params }: Ctx) {
  const user = await requireCompetitionApiUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { id } = await params;
  const body = (await request.json()) as Omit<CompetitionBilletFacture, "competition_id" | "id">;
  const { data, error } = await upsertCompetitionBilletFacture(id, body, user.id);
  if (error) return NextResponse.json({ error }, { status: 400 });
  return NextResponse.json({ facture: data });
}
