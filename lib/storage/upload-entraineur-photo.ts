import { createSupabaseBrowserClientAsync } from "@/lib/supabase/browser";
import { updateEntraineur } from "@/lib/supabase/queries";
import { cacheEntraineurPhotoUrl } from "@/lib/storage/entraineur-photo-cache";
import type { EntraineurPhotoUploadResult } from "@/lib/storage/entraineur-photo-types";

const ENTRAINEURS_PHOTOS_BUCKET = "entraineurs-photos";
const FALLBACK_BUCKET = "joueurs-photos";
const MAX_SIZE = 2 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

function isBucketMissingError(message: string): boolean {
  return /bucket not found|Bucket not found|does not exist/i.test(message);
}

async function persistPhotoUrlClient(
  entraineurId: string,
  url: string
): Promise<Pick<EntraineurPhotoUploadResult, "photoUrlSaved" | "warning">> {
  const res = await updateEntraineur(entraineurId, { photo_url: url });
  if (!res.ok) {
    return { photoUrlSaved: false, warning: res.error ?? "URL photo non enregistrée en base." };
  }
  if (res.skippedColumns?.includes("photo_url")) {
    return {
      photoUrlSaved: false,
      warning:
        "Photo stockée mais colonne photo_url absente. Exécutez lib/db/migrations/entraineurs_photo_url.sql dans Supabase.",
    };
  }
  return { photoUrlSaved: true };
}

export async function uploadEntraineurPhoto(
  file: File,
  entraineurId: string
): Promise<EntraineurPhotoUploadResult> {
  if (!ALLOWED.includes(file.type)) {
    throw new Error("Format accepté : JPG, PNG ou WebP.");
  }
  if (file.size > MAX_SIZE) {
    throw new Error("La photo ne doit pas dépasser 2 Mo.");
  }

  const form = new FormData();
  form.append("file", file);

  try {
    const res = await fetch(`/api/entraineurs/${entraineurId}/photo`, {
      method: "POST",
      body: form,
      credentials: "include",
    });
    const body = (await res.json()) as {
      url?: string;
      photoUrlSaved?: boolean;
      warning?: string;
      error?: string;
      hint?: string;
    };
    if (res.ok && body.url) {
      cacheEntraineurPhotoUrl(entraineurId, body.url);
      return {
        url: body.url,
        photoUrlSaved: body.photoUrlSaved !== false,
        warning: body.warning,
      };
    }
    if (body.error) {
      throw new Error(body.hint ? `${body.error} — ${body.hint}` : body.error);
    }
  } catch (e) {
    if (e instanceof Error && !/fetch|network|failed/i.test(e.message)) {
      throw e;
    }
  }

  const supabase = await createSupabaseBrowserClientAsync();
  if (!supabase) throw new Error("Supabase non disponible");

  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${entraineurId}/${Date.now()}.${ext}`;

  let { error: uploadError } = await supabase.storage
    .from(ENTRAINEURS_PHOTOS_BUCKET)
    .upload(path, file, { upsert: true, cacheControl: "3600" });

  if (uploadError && isBucketMissingError(uploadError.message)) {
    const fallbackPath = `entraineurs/${path}`;
    const fallback = await supabase.storage.from(FALLBACK_BUCKET).upload(fallbackPath, file, {
      upsert: true,
      cacheControl: "3600",
    });
    uploadError = fallback.error;
    if (!uploadError) {
      const { data } = supabase.storage.from(FALLBACK_BUCKET).getPublicUrl(fallbackPath);
      const persist = await persistPhotoUrlClient(entraineurId, data.publicUrl);
      cacheEntraineurPhotoUrl(entraineurId, data.publicUrl);
      return { url: data.publicUrl, ...persist };
    }
  }

  if (uploadError) {
    const hint = isBucketMissingError(uploadError.message)
      ? " Exécutez lib/db/migrations/entraineurs_photos_bucket.sql dans Supabase SQL Editor."
      : "";
    throw new Error(uploadError.message + hint);
  }

  const { data } = supabase.storage.from(ENTRAINEURS_PHOTOS_BUCKET).getPublicUrl(path);
  const persist = await persistPhotoUrlClient(entraineurId, data.publicUrl);
  cacheEntraineurPhotoUrl(entraineurId, data.publicUrl);
  return { url: data.publicUrl, ...persist };
}
