import {
  getSupabaseEnvDiagnostics,
  getSupabasePublicEnv,
  isSupabaseConfigured,
  SUPABASE_ENV,
} from "@/lib/supabase/config";
import { getSiteUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const diagnostics = getSupabaseEnvDiagnostics();
  const configured = isSupabaseConfigured();
  const { anonKey } = getSupabasePublicEnv();

  return Response.json({
    ok: true,
    supabaseConfigured: configured,
    siteUrl: getSiteUrl(),
    vercel: Boolean(process.env.VERCEL),
    envKeys: {
      url: SUPABASE_ENV.URL,
      anonKey: SUPABASE_ENV.ANON_KEY,
      publishableKey: SUPABASE_ENV.PUBLISHABLE_KEY,
    },
    diagnostics: {
      ...diagnostics,
      keyPrefix: anonKey ? `${anonKey.slice(0, 12)}…` : null,
    },
    authKeyOk: diagnostics.authReady,
    hint: configured && diagnostics.keyKind === "publishable"
      ? "Cle publishable OK pour demarrer. Pour login garanti, ajoutez aussi la cle anon eyJ... dans .env.local."
      : configured
      ? null
      : !diagnostics.hasUrl
        ? `Variable manquante : ${SUPABASE_ENV.URL}`
        : !diagnostics.hasAnonKey
          ? `Variable manquante : ${SUPABASE_ENV.ANON_KEY}`
          : !diagnostics.notPlaceholder
            ? "Valeur placeholder — collez la vraie clé Supabase (Settings → API)"
            : !diagnostics.urlHttps
              ? "URL doit commencer par https://"
              : !diagnostics.keyMinLength
                ? "Clé trop courte"
                : "Configuration Supabase invalide",
  });
}
