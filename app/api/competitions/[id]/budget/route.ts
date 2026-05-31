import { NextResponse } from "next/server";
import { requireCompetitionApiUser } from "@/lib/competitions/auth-api";
import { listBudget, upsertBudgetLine } from "@/lib/competitions/server";
import type { CompetitionBudgetCategorie } from "@/lib/types/competition";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Ctx) {
  const user = await requireCompetitionApiUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { id } = await params;
  const { data, error } = await listBudget(id);
  if (error) return NextResponse.json({ error, lines: [] }, { status: 500 });
  return NextResponse.json({ lines: data });
}

export async function PUT(request: Request, { params }: Ctx) {
  const user = await requireCompetitionApiUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { id } = await params;
  const body = (await request.json()) as {
    categorie: CompetitionBudgetCategorie;
    montant_prevu: number;
    montant_reel: number;
    notes?: string | null;
  };
  const { data, error } = await upsertBudgetLine(
    id,
    body.categorie,
    body.montant_prevu,
    body.montant_reel,
    body.notes ?? null,
    user.id
  );
  if (error) return NextResponse.json({ error }, { status: 400 });
  return NextResponse.json({ line: data });
}
