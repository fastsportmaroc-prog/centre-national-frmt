import {
  getSupabaseEnvDiagnostics,
  isSupabaseConfigured,
  SUPABASE_ENV,
} from "@/lib/supabase/config";
import { getSiteUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const diagnostics = getSupabaseEnvDiagnostics();
  const configured = isSupabaseConfigured();

  return Response.json({
    ok: true,
    supabaseConfigured: configured,
    siteUrl: getSiteUrl(),
    vercel: Boolean(process.env.VERCEL),
    envKeys: {
      url: SUPABASE_ENV.URL,
      anonKey: SUPABASE_ENV.ANON_KEY,
    },
    diagnostics,
    hint: configured
      ? null
      : !diagnostics.hasUrl
        ? `Variable manquante : ${SUPABASE_ENV.URL}`
        : !diagnostics.hasAnonKey
          ? `Variable manquante : ${SUPABASE_ENV.ANON_KEY}`
          : !diagnostics.notPlaceholder
            ? "Valeur placeholder détectée — utilisez les vraies clés Supabase"
            : !diagnostics.urlHttps
              ? "URL doit commencer par https://"
              : !diagnostics.keyMinLength
                ? "Clé anon trop courte — vérifiez NEXT_PUBLIC_SUPABASE_ANON_KEY"
                : "Configuration Supabase invalide",
  });
}
