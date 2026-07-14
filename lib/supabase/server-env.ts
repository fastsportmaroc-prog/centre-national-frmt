import "server-only";
import { getSupabasePublicEnv } from "./config";
import { readSupabaseEnvFromFile } from "./env-file";

/** Environnement Supabase côté serveur — .env.local prioritaire (évite clés périmées du build). */
export function getServerSupabaseEnv(): {
  url: string;
  anonKey: string;
  serviceRole: string;
} {
  const file = readSupabaseEnvFromFile();
  const proc = getSupabasePublicEnv();

  const url = file.url || proc.url;
  const anonKey =
    file.anonKey && file.anonKey.length >= 20
      ? file.anonKey
      : proc.anonKey;
  const serviceRole = file.serviceRole || "";

  return { url, anonKey, serviceRole };
}

export function extractSupabaseProjectRef(url: string): string | null {
  try {
    return new URL(url).hostname.split(".")[0] || null;
  } catch {
    return null;
  }
}

export function extractJwtRef(jwt: string): string | null {
  try {
    const part = jwt.split(".")[1];
    if (!part) return null;
    const json = Buffer.from(part.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString(
      "utf8"
    );
    const payload = JSON.parse(json) as { ref?: string };
    return payload.ref ?? null;
  } catch {
    return null;
  }
}

export function validateSupabaseEnvMatch(url: string, anonKey: string): string | null {
  if (!url || !anonKey) return "URL ou clé anon manquante";
  const hostRef = extractSupabaseProjectRef(url);
  const keyRef = extractJwtRef(anonKey);
  if (hostRef && keyRef && hostRef !== keyRef) {
    return `Clé anon pour le projet "${keyRef}" mais URL pointe vers "${hostRef}". Recopiez les clés depuis Supabase → Settings → API du même projet.`;
  }
  return null;
}
