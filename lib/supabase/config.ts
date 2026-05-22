/**
 * Config Supabase (process.env — compatible Edge middleware + client).
 */

export const SUPABASE_ENV = {
  URL: "NEXT_PUBLIC_SUPABASE_URL",
  ANON_KEY: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  PUBLISHABLE_KEY: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
} as const;

const PLACEHOLDER_MARKERS = [
  "votre-projet",
  "votre_cle",
  "COLLE_ICI",
  "TA_VRAIE",
  "example.com",
];

function readEnv(name: string): string {
  const raw = process.env[name];
  if (typeof raw !== "string") return "";
  return raw.trim().replace(/^["']|["']$/g, "");
}

function isPlaceholder(value: string): boolean {
  const v = value.toLowerCase();
  return PLACEHOLDER_MARKERS.some((m) => v.includes(m));
}

function readAnonKey(): string {
  const anon = readEnv(SUPABASE_ENV.ANON_KEY);
  const pub = readEnv(SUPABASE_ENV.PUBLISHABLE_KEY);
  if (anon && !isPlaceholder(anon)) return anon;
  if (pub && !isPlaceholder(pub)) return pub;
  return anon || pub;
}

export function getSupabasePublicEnv(): { url: string; anonKey: string } {
  const url = readEnv(SUPABASE_ENV.URL);
  return { url: isPlaceholder(url) ? "" : url, anonKey: readAnonKey() };
}

export type SupabaseKeyKind = "jwt" | "publishable" | "unknown" | "missing";

export function getSupabaseKeyKind(key: string): SupabaseKeyKind {
  if (!key) return "missing";
  if (key.startsWith("eyJ")) return "jwt";
  if (key.startsWith("sb_publishable_")) return "publishable";
  return key.length >= 20 ? "unknown" : "missing";
}

export type SupabaseEnvDiagnostics = {
  hasUrl: boolean;
  hasAnonKey: boolean;
  urlHttps: boolean;
  keyMinLength: boolean;
  notPlaceholder: boolean;
  keyLength: number;
  keyKind: SupabaseKeyKind;
  urlHost: string | null;
  authReady: boolean;
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

  const keyKind = getSupabaseKeyKind(anonKey);
  const authReady =
    keyKind === "jwt" || keyKind === "publishable" || keyKind === "unknown";

  return {
    hasUrl: url.length > 0,
    hasAnonKey: anonKey.length > 0,
    urlHttps: url.startsWith("https://") || url.startsWith("http://"),
    keyMinLength: anonKey.length >= 20,
    notPlaceholder,
    keyLength: anonKey.length,
    keyKind,
    urlHost,
    authReady,
  };
}

export function isSupabaseConfigured(): boolean {
  const { url, anonKey } = getSupabasePublicEnv();
  const d = getSupabaseEnvDiagnostics();
  if (!d.hasUrl || !d.hasAnonKey || !d.notPlaceholder || !d.urlHttps) return false;
  if (!d.keyMinLength || !d.authReady) return false;
  try {
    new URL(url);
  } catch {
    return false;
  }
  return Boolean(url && anonKey);
}

export function getSupabaseEnv() {
  return getSupabasePublicEnv();
}
