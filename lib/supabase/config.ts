export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) return false;
  if (
    url.includes("votre-projet") ||
    key.includes("votre_cle") ||
    key.includes("COLLE_ICI")
  ) {
    return false;
  }
  if (!url.startsWith("https://") || !url.includes(".supabase.co")) return false;
  return true;
}

export function getSupabaseEnv() {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  };
}
