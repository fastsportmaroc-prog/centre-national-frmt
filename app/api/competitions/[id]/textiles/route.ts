import { NextResponse } from "next/server";
import { requireCompetitionApiUser } from "@/lib/competitions/auth-api";
import { assignTextile, listTextiles, removeTextile } from "@/lib/competitions/server";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Ctx) {
  const user = await requireCompetitionApiUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { id } = await params;
  const { data, error } = await listTextiles(id);
  if (error) return NextResponse.json({ error, textiles: [] }, { status: 500 });
  return NextResponse.json({ textiles: data });
}

export async function POST(request: Request, { params }: Ctx) {
  const user = await requireCompetitionApiUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { id } = await params;
  const body = (await request.json()) as {
    participant_id: string;
    article_id: string;
    taille?: string;
    quantite: number;
  };
  const { data, error } = await assignTextile(id, body, user.id);
  if (error) return NextResponse.json({ error }, { status: 400 });
  return NextResponse.json({ textile: data });
}

export async function DELETE(request: Request, { params }: Ctx) {
  const user = await requireCompetitionApiUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { id } = await params;
  const textileId = new URL(request.url).searchParams.get("textile_id");
  if (!textileId) return NextResponse.json({ error: "textile_id requis" }, { status: 400 });
  const { ok, error } = await removeTextile(textileId, id, user.id);
  if (!ok) return NextResponse.json({ error }, { status: 400 });
  return NextResponse.json({ ok: true });
}
