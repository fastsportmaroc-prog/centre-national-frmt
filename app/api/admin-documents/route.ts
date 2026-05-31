import { NextResponse } from "next/server";
import { requireAdminDocumentsAccess } from "@/lib/auth/require-admin-documents";
import {
  serverCreateAdminDocument,
  serverListAdminDocuments,
} from "@/lib/supabase/admin-documents.server";
import type { AdminDocumentInput } from "@/lib/types/admin-document";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await requireAdminDocumentsAccess())) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }
  const { data, error } = await serverListAdminDocuments();
  if (error) {
    const hint = error.includes("documents_administratifs")
      ? "Supabase → SQL Editor : exécutez le fichier supabase/apply-documents-administratifs.sql puis rechargez la page."
      : undefined;
    return NextResponse.json({ error, hint, documents: [] }, { status: 500 });
  }
  return NextResponse.json({ documents: data ?? [] });
}

export async function POST(request: Request) {
  if (!(await requireAdminDocumentsAccess())) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }
  const body = (await request.json()) as AdminDocumentInput;
  const { data, error } = await serverCreateAdminDocument(body);
  if (error) return NextResponse.json({ error }, { status: 500 });
  return NextResponse.json({ document: data });
}
