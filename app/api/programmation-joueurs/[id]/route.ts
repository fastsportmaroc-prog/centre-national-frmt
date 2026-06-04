import { NextResponse } from "next/server";
import { requireProgrammationApiUser } from "@/lib/programmation-joueurs/auth-api";
import {
  deleteProgrammationEvenement,
  getProgrammationEvenement,
  updateProgrammationEvenement,
} from "@/lib/programmation-joueurs/server";
import type { ProgrammationEvenementInput } from "@/lib/types/programmation-joueurs";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Ctx) {
  const user = await requireProgrammationApiUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { id } = await params;
  const { data, error } = await getProgrammationEvenement(id);
  if (error) return NextResponse.json({ error, evenement: null }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Événement introuvable" }, { status: 404 });
  return NextResponse.json({ evenement: data });
}

export async function PUT(request: Request, { params }: Ctx) {
  const user = await requireProgrammationApiUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { id } = await params;
  const body = (await request.json()) as Partial<ProgrammationEvenementInput>;
  const { data, error } = await updateProgrammationEvenement(id, body);
  if (error) return NextResponse.json({ error }, { status: 400 });
  if (!data) return NextResponse.json({ error: "Événement introuvable" }, { status: 404 });
  return NextResponse.json({ evenement: data });
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const user = await requireProgrammationApiUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { id } = await params;
  const { ok, error } = await deleteProgrammationEvenement(id);
  if (error) return NextResponse.json({ error, ok: false }, { status: 400 });
  return NextResponse.json({ ok });
}
