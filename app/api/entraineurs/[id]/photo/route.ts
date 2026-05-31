import { NextResponse } from "next/server";
import {
  persistEntraineurPhotoUrl,
  serverUploadEntraineurPhoto,
} from "@/lib/storage/entraineur-photo.server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const MAX_SIZE = 2 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase non configuré" }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { id: entraineurId } = await context.params;
  if (!entraineurId) {
    return NextResponse.json({ error: "ID entraîneur manquant" }, { status: 400 });
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Fichier manquant" }, { status: 400 });
  }
  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json(
      { error: "Format accepté : JPG, PNG ou WebP." },
      { status: 400 }
    );
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "La photo ne doit pas dépasser 2 Mo." }, { status: 400 });
  }

  const { url, error, hint } = await serverUploadEntraineurPhoto(file, entraineurId);
  if (error || !url) {
    return NextResponse.json({ error: error ?? "Upload impossible", hint }, { status: 500 });
  }

  const persist = await persistEntraineurPhotoUrl(entraineurId, url);

  return NextResponse.json({
    url,
    photoUrlSaved: persist.ok && persist.photoUrlSaved,
    warning: persist.warning,
    error: persist.ok ? undefined : persist.error,
    hint: persist.ok ? undefined : hint,
  });
}
