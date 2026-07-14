import { NextResponse } from "next/server";
import { requireProgrammationApiUser } from "@/lib/programmation-joueurs/auth-api";
import { filterProgrammationEvenements } from "@/lib/auth/apply-player-category-filter.server";
import { getPlayerCategoryContext } from "@/lib/auth/player-category-context.server";
import { requireProgrammationManageAccess } from "@/lib/auth/planning-cne-access.server";
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

  const ctx = await getPlayerCategoryContext();
  const { id } = await params;
  const { data, error } = await getProgrammationEvenement(id);
  if (error) return NextResponse.json({ error, evenement: null }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Événement introuvable" }, { status: 404 });
  const [filtered] = filterProgrammationEvenements([data], ctx);
  if (!filtered) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  return NextResponse.json({ evenement: filtered });
}

export async function PUT(request: Request, { params }: Ctx) {
  const user = await requireProgrammationApiUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const manage = await requireProgrammationManageAccess();
  if (!manage.ok) return NextResponse.json({ error: manage.error }, { status: manage.status });

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

  const manage = await requireProgrammationManageAccess();
  if (!manage.ok) return NextResponse.json({ error: manage.error }, { status: manage.status });

  const { id } = await params;
  const { ok, error } = await deleteProgrammationEvenement(id);
  if (error) return NextResponse.json({ error, ok: false }, { status: 400 });
  return NextResponse.json({ ok });
}
