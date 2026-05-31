import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AdminDocument, AdminDocumentInput } from "@/lib/types/admin-document";

const TABLE = "documents_administratifs";
const BUCKET = "admin-documents";

function now() {
  return new Date().toISOString();
}

export async function serverListAdminDocuments(): Promise<{
  data: AdminDocument[] | null;
  error: string | null;
}> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { data: null, error: "Supabase non configuré (.env.local)" };
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .order("expiration_date", { ascending: true, nullsFirst: false });
  if (error) return { data: null, error: error.message };
  return { data: (data ?? []) as AdminDocument[], error: null };
}

export async function serverCreateAdminDocument(
  input: AdminDocumentInput
): Promise<{ data: AdminDocument | null; error: string | null }> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { data: null, error: "Supabase non configuré" };
  const { data, error } = await supabase
    .from(TABLE)
    .insert({ ...input, updated_at: now() })
    .select()
    .single();
  if (error) return { data: null, error: error.message };
  return { data: data as AdminDocument, error: null };
}

export async function serverUpdateAdminDocument(
  id: string,
  patch: Partial<AdminDocumentInput>
): Promise<{ data: AdminDocument | null; error: string | null }> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { data: null, error: "Supabase non configuré" };
  const { data, error } = await supabase
    .from(TABLE)
    .update({ ...patch, updated_at: now() })
    .eq("id", id)
    .select()
    .single();
  if (error) return { data: null, error: error.message };
  return { data: data as AdminDocument, error: null };
}

export async function serverDeleteAdminDocument(id: string): Promise<{ error: string | null }> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: "Supabase non configuré" };
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  return { error: error?.message ?? null };
}

export async function serverUploadAdminDocumentFile(
  file: File,
  documentId: string
): Promise<{ url: string | null; error: string | null }> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { url: null, error: "Supabase non configuré" };

  const ext = file.name.split(".").pop() ?? "pdf";
  const path = `${documentId}/${Date.now()}.${ext}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, buffer, {
    upsert: true,
    cacheControl: "3600",
    contentType: file.type || undefined,
  });

  if (uploadError) return { url: null, error: uploadError.message };

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, error: null };
}
