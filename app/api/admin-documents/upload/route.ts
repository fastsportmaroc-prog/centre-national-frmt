import { NextResponse } from "next/server";
import { requireAdminDocumentsAccess } from "@/lib/auth/require-admin-documents";
import { serverUploadAdminDocumentFile } from "@/lib/supabase/admin-documents.server";

export const dynamic = "force-dynamic";

const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

export async function POST(request: Request) {
  if (!(await requireAdminDocumentsAccess())) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const form = await request.formData();
  const file = form.get("file");
  const documentId = String(form.get("documentId") ?? "");

  if (!(file instanceof File) || !documentId) {
    return NextResponse.json({ error: "Fichier ou documentId manquant" }, { status: 400 });
  }
  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json(
      { error: "Format accepté : JPG, PNG, WebP ou PDF." },
      { status: 400 }
    );
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "Fichier max 5 Mo." }, { status: 400 });
  }

  const { url, error } = await serverUploadAdminDocumentFile(file, documentId);
  if (error) {
    const hint = error.includes("Bucket") || error.includes("bucket")
      ? "Créez le bucket admin-documents (migration 023) dans Supabase Storage."
      : undefined;
    return NextResponse.json({ error, hint }, { status: 500 });
  }
  return NextResponse.json({ url });
}
