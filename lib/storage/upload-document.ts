import { createSupabaseBrowserClientAsync } from "@/lib/supabase/browser";
import { assertSupabaseConfigured } from "@/lib/supabase/assert-configured";

const DEFAULT_BUCKET = "admin-documents";
const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

export async function uploadDocument(
  file: File,
  dossierId: string,
  bucket: string = DEFAULT_BUCKET
): Promise<string> {
  if (!ALLOWED.includes(file.type)) {
    throw new Error("Format accepté : JPG, PNG, WebP ou PDF.");
  }
  if (file.size > MAX_SIZE) {
    throw new Error("Le fichier ne doit pas dépasser 5 Mo.");
  }

  const supabase = await createSupabaseBrowserClientAsync();
  if (!supabase) throw new Error("Supabase non disponible");

  const ext = file.name.split(".").pop() ?? "pdf";
  const path = `${dossierId}/${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(path, file, { upsert: true, cacheControl: "3600" });

  if (uploadError) throw new Error(uploadError.message);

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}
