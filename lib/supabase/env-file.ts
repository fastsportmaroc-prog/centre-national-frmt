import { readFileSync, existsSync } from "fs";
import { join } from "path";

const PLACEHOLDER_MARKERS = [
  "votre-projet",
  "votre_cle",
  "COLLE_ICI",
  "TA_VRAIE",
  "example.com",
  "xxxxxxxx",
];

function isPlaceholder(value: string): boolean {
  const v = value.toLowerCase();
  return PLACEHOLDER_MARKERS.some((m) => v.includes(m.toLowerCase()));
}

function parseEnvFile(content: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of content.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 1) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (val) out[key] = val;
  }
  return out;
}

function pickBestAnonKey(entries: Record<string, string>): string {
  const candidates = [
    entries.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    entries.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  ].filter((k): k is string => Boolean(k) && !isPlaceholder(k));

  const jwt = candidates.find((k) => k.startsWith("eyJ"));
  if (jwt) return jwt;

  const publishable = candidates.find((k) => k.startsWith("sb_publishable_"));
  if (publishable) return publishable;

  return candidates[0] ?? "";
}

let cached: { url: string; anonKey: string; serviceRole: string } | null = null;

/** Lit .env.local côté serveur (évite doublons / placeholders corrompus). */
export function readSupabaseEnvFromFile(): {
  url: string;
  anonKey: string;
  serviceRole: string;
} {
  if (cached) return cached;

  const root = process.cwd();
  const path = join(root, ".env.local");
  if (!existsSync(path)) {
    cached = { url: "", anonKey: "", serviceRole: "" };
    return cached;
  }

  const entries = parseEnvFile(readFileSync(path, "utf8"));
  const url = (entries.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
  const anonKey = pickBestAnonKey(entries);
  const serviceRole = (entries.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();

  cached = {
    url: isPlaceholder(url) ? "" : url,
    anonKey,
    serviceRole: isPlaceholder(serviceRole) ? "" : serviceRole,
  };
  return cached;
}

export function resetSupabaseEnvFileCache(): void {
  cached = null;
}
