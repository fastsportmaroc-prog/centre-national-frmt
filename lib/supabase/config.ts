/**
 * Source unique des variables Supabase (noms exacts Vercel / .env.local).
 * NEXT_PUBLIC_* sont injectées au build ; /api/health valide au runtime.
 */

export const SUPABASE_ENV = {
  URL: "NEXT_PUBLIC_SUPABASE_URL",
  ANON_KEY: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
} as const;

const PLACEHOLDER_MARKERS = [
  "votre-projet",
  "votre_cle",
  "votre-projet.supabase",
  "COLLE_ICI",
  "example.com",
  "xxx",
];

function readEnv(name: string): string {
  const raw = process.env[name];
  if (typeof raw !== "string") return "";
  return raw.trim().replace(/^["']|["']$/g, "");
}

export function getSupabasePublicEnv(): { url: string; anonKey: string } {
  return {
    url: readEnv(SUPABASE_ENV.URL),
    anonKey: readEnv(SUPABASE_ENV.ANON_KEY),
  };
}

export type SupabaseEnvDiagnostics = {
  hasUrl: boolean;
  hasAnonKey: boolean;
  urlHttps: boolean;
  keyMinLength: boolean;
  notPlaceholder: boolean;
  keyLength: number;
  urlHost: string | null;
};

export function getSupabaseEnvDiagnostics(): SupabaseEnvDiagnostics {
  const { url, anonKey } = getSupabasePublicEnv();
  const combined = `${url} ${anonKey}`.toLowerCase();
  const notPlaceholder = !PLACEHOLDER_MARKERS.some((m) => combined.includes(m));

  let urlHost: string | null = null;
  try {
    if (url) urlHost = new URL(url).hostname;
  } catch {
    urlHost = null;
  }

  return {
    hasUrl: url.length > 0,
    hasAnonKey: anonKey.length > 0,
    urlHttps: url.startsWith("https://") || url.startsWith("http://"),
    keyMinLength: anonKey.length >= 20,
    notPlaceholder,
    keyLength: anonKey.length,
    urlHost,
  };
}

export function isSupabaseConfigured(): boolean {
  const { url, anonKey } = getSupabasePublicEnv();
  const d = getSupabaseEnvDiagnostics();

  if (!d.hasUrl || !d.hasAnonKey) return false;
  if (!d.notPlaceholder) return false;
  if (!d.urlHttps) return false;
  if (!d.keyMinLength) return false;

  try {
    new URL(url);
  } catch {
    return false;
  }

  return Boolean(url && anonKey);
}

/** @deprecated Utiliser getSupabasePublicEnv() */
export function getSupabaseEnv() {
  const { url, anonKey } = getSupabasePublicEnv();
  return { url, anonKey };
}
