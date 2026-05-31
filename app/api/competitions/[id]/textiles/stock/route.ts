import { NextResponse } from "next/server";
import { requireCompetitionApiUser } from "@/lib/competitions/auth-api";
import {
  listCompetitionTextileStock,
  upsertCompetitionTextileStock,
} from "@/lib/competitions/server";
import type { CompetitionMaterielStockInput } from "@/lib/types/competition";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Ctx) {
  const user = await requireCompetitionApiUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { id } = await params;
  const { data, error } = await listCompetitionTextileStock(id);
  if (error) return NextResponse.json({ error, stock: data }, { status: 500 });
  return NextResponse.json({ stock: data });
}

export async function PUT(request: Request, { params }: Ctx) {
  const user = await requireCompetitionApiUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { id } = await params;
  const body = (await request.json()) as { items?: CompetitionMaterielStockInput[] };
  const items = body.items ?? [];
  if (items.length === 0) {
    return NextResponse.json({ error: "items requis" }, { status: 400 });
  }
  const { data, error } = await upsertCompetitionTextileStock(id, items, user.id);
  if (error) return NextResponse.json({ error }, { status: 400 });
  return NextResponse.json({ stock: data });
}
