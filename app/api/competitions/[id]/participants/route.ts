import { NextResponse } from "next/server";
import { requireCompetitionApiUser } from "@/lib/competitions/auth-api";
import {
  addParticipant,
  listParticipantsEnriched,
  removeParticipant,
} from "@/lib/competitions/server";
import type { CompetitionParticipantType } from "@/lib/types/competition";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Ctx) {
  const user = await requireCompetitionApiUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { id } = await params;
  const dateFin = new URL(request.url).searchParams.get("date_fin") ?? new Date().toISOString().slice(0, 10);
  const { data, error } = await listParticipantsEnriched(id, dateFin);
  if (error) return NextResponse.json({ error, participants: [] }, { status: 500 });
  return NextResponse.json({ participants: data });
}

export async function POST(request: Request, { params }: Ctx) {
  const user = await requireCompetitionApiUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { id } = await params;
  const body = (await request.json()) as {
    participant_id?: string;
    participant_type: CompetitionParticipantType;
    libelle?: string | null;
    prenom?: string | null;
    nom?: string | null;
  };
  const libelle =
    body.libelle?.trim() ||
    [body.prenom?.trim(), body.nom?.trim()].filter(Boolean).join(" ") ||
    null;
  const { data, error } = await addParticipant(
    id,
    body.participant_id ?? "",
    body.participant_type,
    user.id,
    { libelle }
  );
  if (error) return NextResponse.json({ error }, { status: 400 });
  return NextResponse.json({ participant: data });
}

export async function DELETE(request: Request, { params }: Ctx) {
  const user = await requireCompetitionApiUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { id } = await params;
  const participantRowId = new URL(request.url).searchParams.get("row_id");
  if (!participantRowId) return NextResponse.json({ error: "row_id requis" }, { status: 400 });
  const { ok, error } = await removeParticipant(participantRowId, id, user.id);
  if (!ok) return NextResponse.json({ error }, { status: 400 });
  return NextResponse.json({ ok: true });
}
