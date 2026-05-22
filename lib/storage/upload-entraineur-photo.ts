import { createSupabaseBrowserClientAsync } from "@/lib/supabase/browser";
import { assertSupabaseConfigured } from "@/lib/supabase/assert-configured";

const BUCKET = "entraineurs-photos";
const MAX_SIZE = 2 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

export async function uploadEntraineurPhoto(
  file: File,
  entraineurId: string
): Promise<string> {
  if (!ALLOWED.includes(file.type)) {
    throw new Error("Format accepté : JPG, PNG ou WebP.");
  }
  if (file.size > MAX_SIZE) {
    throw new Error("La photo ne doit pas dépasser 2 Mo.");
  }

  const supabase = await createSupabaseBrowserClientAsync();
  if (!supabase) throw new Error("Supabase non disponible");

  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${entraineurId}/${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true, cacheControl: "3600" });

  if (uploadError) throw new Error(uploadError.message);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
