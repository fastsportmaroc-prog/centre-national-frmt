import { NextResponse } from "next/server";
import { requireAdminDocumentsAccess } from "@/lib/auth/require-admin-documents";
import {
  serverDeleteAdminDocument,
  serverUpdateAdminDocument,
} from "@/lib/supabase/admin-documents.server";
import type { AdminDocumentInput } from "@/lib/types/admin-document";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Ctx) {
  if (!(await requireAdminDocumentsAccess())) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }
  const { id } = await params;
  const body = (await request.json()) as Partial<AdminDocumentInput>;
  const { data, error } = await serverUpdateAdminDocument(id, body);
  if (error) return NextResponse.json({ error }, { status: 500 });
  return NextResponse.json({ document: data });
}

export async function DELETE(_request: Request, { params }: Ctx) {
  if (!(await requireAdminDocumentsAccess())) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }
  const { id } = await params;
  const { error } = await serverDeleteAdminDocument(id);
  if (error) return NextResponse.json({ error }, { status: 500 });
  return NextResponse.json({ ok: true });
}
