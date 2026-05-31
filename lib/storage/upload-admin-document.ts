import { isSupabaseConfigured } from "@/lib/supabase/config";
import { shouldUseLocalTestStorage } from "@/lib/local-test/mode";

const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Lecture du fichier impossible"));
    reader.readAsDataURL(file);
  });
}

async function parseUploadError(res: Response): Promise<string> {
  try {
    const json = (await res.json()) as { error?: string; hint?: string };
    if (json.hint) return `${json.error ?? "Erreur"} — ${json.hint}`;
    return json.error ?? `Erreur HTTP ${res.status}`;
  } catch {
    return `Erreur HTTP ${res.status}`;
  }
}

/** Upload via API Supabase (session serveur) ou data-URL en mode local. */
export async function uploadAdminDocumentFile(file: File, documentId: string): Promise<string> {
  if (!ALLOWED.includes(file.type)) {
    throw new Error("Format accepté : JPG, PNG, WebP ou PDF.");
  }
  if (file.size > MAX_SIZE) {
    throw new Error("Le fichier ne doit pas dépasser 5 Mo.");
  }

  if (shouldUseLocalTestStorage() || !isSupabaseConfigured()) {
    return readFileAsDataUrl(file);
  }

  const form = new FormData();
  form.append("file", file);
  form.append("documentId", documentId);

  const res = await fetch("/api/admin-documents/upload", {
    method: "POST",
    credentials: "include",
    body: form,
  });

  if (!res.ok) throw new Error(await parseUploadError(res));

  const json = (await res.json()) as { url?: string };
  if (!json.url) throw new Error("URL fichier manquante");
  return json.url;
}
