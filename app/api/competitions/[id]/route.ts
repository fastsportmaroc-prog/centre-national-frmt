import { NextResponse } from "next/server";
import { requireCompetitionApiUser } from "@/lib/competitions/auth-api";
import { deleteCompetition, getCompetition, updateCompetition } from "@/lib/competitions/server";
import type { CompetitionInput } from "@/lib/types/competition";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Ctx) {
  const user = await requireCompetitionApiUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { id } = await params;
  const { data, error } = await getCompetition(id);
  if (error) return NextResponse.json({ error }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json({ competition: data });
}

export async function PATCH(request: Request, { params }: Ctx) {
  const user = await requireCompetitionApiUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { id } = await params;
  const body = (await request.json()) as Partial<CompetitionInput>;
  const { data, error, warning } = await updateCompetition(id, body, user.id);
  if (error) return NextResponse.json({ error }, { status: 500 });
  return NextResponse.json({ competition: data, warning: warning ?? null });
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const user = await requireCompetitionApiUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { id } = await params;
  const { ok, error } = await deleteCompetition(id, user.id);
  if (!ok) return NextResponse.json({ error }, { status: 500 });
  return NextResponse.json({ ok: true });
}
