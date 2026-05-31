import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin.server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { mutateOmitMissingColumns } from "@/lib/supabase/mutate-omit-missing-columns";

export const ENTRAINEURS_PHOTOS_BUCKET = "entraineurs-photos";
/** Secours si le bucket coach n'existe pas encore (même bucket que les joueurs). */
const FALLBACK_BUCKET = "joueurs-photos";

const MAX_SIZE = 2 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

function isBucketMissingError(message: string): boolean {
  return /bucket not found|Bucket not found|does not exist/i.test(message);
}

export async function ensureEntraineursPhotosBucket(): Promise<boolean> {
  const admin = createSupabaseAdminClient();
  if (!admin) return false;

  const { data: buckets, error: listError } = await admin.storage.listBuckets();
  if (listError) return false;
  if (buckets?.some((b) => b.id === ENTRAINEURS_PHOTOS_BUCKET || b.name === ENTRAINEURS_PHOTOS_BUCKET)) {
    return true;
  }

  const { error } = await admin.storage.createBucket(ENTRAINEURS_PHOTOS_BUCKET, {
    public: true,
    fileSizeLimit: MAX_SIZE,
    allowedMimeTypes: ALLOWED,
  });

  return !error || /already exists|duplicate/i.test(error.message);
}

export async function serverUploadEntraineurPhoto(
  file: File,
  entraineurId: string
): Promise<{ url: string | null; error: string | null; hint?: string }> {
  if (!ALLOWED.includes(file.type)) {
    return { url: null, error: "Format accepté : JPG, PNG ou WebP." };
  }
  if (file.size > MAX_SIZE) {
    return { url: null, error: "La photo ne doit pas dépasser 2 Mo." };
  }

  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${entraineurId}/${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const uploadOpts = {
    upsert: true,
    cacheControl: "3600",
    contentType: file.type || undefined,
  };

  const admin = createSupabaseAdminClient();
  if (admin) {
    await ensureEntraineursPhotosBucket();
    const { error: uploadError } = await admin.storage
      .from(ENTRAINEURS_PHOTOS_BUCKET)
      .upload(path, buffer, uploadOpts);
    if (!uploadError) {
      const { data } = admin.storage.from(ENTRAINEURS_PHOTOS_BUCKET).getPublicUrl(path);
      return { url: data.publicUrl, error: null };
    }
    if (!isBucketMissingError(uploadError.message)) {
      return { url: null, error: uploadError.message };
    }
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return {
      url: null,
      error: "Supabase non configuré",
      hint: "Exécutez lib/db/migrations/entraineurs_photos_bucket.sql dans Supabase SQL Editor.",
    };
  }

  let { error: uploadError } = await supabase.storage
    .from(ENTRAINEURS_PHOTOS_BUCKET)
    .upload(path, buffer, uploadOpts);

  if (uploadError && isBucketMissingError(uploadError.message)) {
    const fallbackPath = `entraineurs/${path}`;
    const fallback = await supabase.storage.from(FALLBACK_BUCKET).upload(fallbackPath, buffer, uploadOpts);
    uploadError = fallback.error;
    if (!uploadError) {
      const { data } = supabase.storage.from(FALLBACK_BUCKET).getPublicUrl(fallbackPath);
      return { url: data.publicUrl, error: null };
    }
  }

  if (uploadError) {
    return {
      url: null,
      error: uploadError.message,
      hint: isBucketMissingError(uploadError.message)
        ? "Exécutez lib/db/migrations/entraineurs_photos_bucket.sql dans Supabase → SQL Editor, ou ajoutez SUPABASE_SERVICE_ROLE_KEY pour création auto du bucket."
        : undefined,
    };
  }

  const { data } = supabase.storage.from(ENTRAINEURS_PHOTOS_BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, error: null };
}

const PHOTO_URL_MIGRATION =
  "lib/db/migrations/entraineurs_photo_url.sql (Supabase → SQL Editor)";

/** Enregistre l’URL photo sur la fiche entraîneur après upload Storage. */
export async function persistEntraineurPhotoUrl(
  entraineurId: string,
  photoUrl: string
): Promise<{ ok: boolean; photoUrlSaved: boolean; warning?: string; error?: string }> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return { ok: false, photoUrlSaved: false, error: "Supabase non configuré" };
  }

  const res = await mutateOmitMissingColumns({ photo_url: photoUrl }, async (payload) => {
    const { error } = await supabase.from("entraineurs").update(payload).eq("id", entraineurId);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  });

  if (!res.ok) {
    return { ok: false, photoUrlSaved: false, error: res.error };
  }

  if (res.skippedColumns?.includes("photo_url")) {
    return {
      ok: true,
      photoUrlSaved: false,
      warning: `Photo stockée mais la colonne photo_url est absente. Exécutez ${PHOTO_URL_MIGRATION}.`,
    };
  }

  return { ok: true, photoUrlSaved: true };
}
