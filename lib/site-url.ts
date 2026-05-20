/**
 * URL publique du site (auth Supabase, liens absolus).
 * Sur Vercel : VERCEL_URL est défini automatiquement si NEXT_PUBLIC_SITE_URL est absent.
 */
export function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit && !explicit.includes("localhost")) {
    return explicit.replace(/\/$/, "");
  }
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    return `https://${vercel.replace(/\/$/, "")}`;
  }
  return "http://localhost:3000";
}
