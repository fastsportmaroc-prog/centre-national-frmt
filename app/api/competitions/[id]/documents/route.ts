import { NextResponse } from "next/server";
import { requireCompetitionApiUser } from "@/lib/competitions/auth-api";
import { addDocument, deleteDocument, listDocuments } from "@/lib/competitions/server";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Ctx) {
  const user = await requireCompetitionApiUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { id } = await params;
  const { data, error } = await listDocuments(id);
  if (error) return NextResponse.json({ error, documents: [] }, { status: 500 });
  return NextResponse.json({ documents: data });
}

export async function POST(request: Request, { params }: Ctx) {
  const user = await requireCompetitionApiUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { id } = await params;
  const body = (await request.json()) as { nom: string; type: string; url: string };
  const { data, error } = await addDocument(
    id,
    { ...body, uploaded_by: user.id },
    user.id
  );
  if (error) return NextResponse.json({ error }, { status: 400 });
  return NextResponse.json({ document: data });
}

export async function DELETE(request: Request, { params }: Ctx) {
  const user = await requireCompetitionApiUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { id } = await params;
  const docId = new URL(request.url).searchParams.get("document_id");
  if (!docId) return NextResponse.json({ error: "document_id requis" }, { status: 400 });
  const { ok, error } = await deleteDocument(docId, id, user.id);
  if (!ok) return NextResponse.json({ error }, { status: 400 });
  return NextResponse.json({ ok: true });
}
