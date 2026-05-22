import {
  getSupabaseEnvDiagnostics,
  getSupabaseKeyKind,
  getSupabasePublicEnv,
  isSupabaseConfigured,
} from "@/lib/supabase/config";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Diagnostic auth (sans mot de passe) — verifie que .env pointe le bon projet. */
export async function GET() {
  const { url, anonKey } = getSupabasePublicEnv();
  const d = getSupabaseEnvDiagnostics();
  const configured = isSupabaseConfigured();

  let projectRef = "";
  try {
    projectRef = new URL(url).hostname.split(".")[0] ?? "";
  } catch {
    projectRef = "";
  }

  const keyKind = getSupabaseKeyKind(anonKey);

  return Response.json({
    configured,
    projectRef,
    urlHost: d.urlHost,
    keyKind,
    keyLength: d.keyLength,
    hint:
      keyKind === "publishable"
        ? "Cle publishable detectee. Si le login echoue avec le bon mot de passe, copiez la cle anon JWT (eyJ...) dans .env.local : Supabase → Settings → API → anon public."
        : keyKind === "jwt"
          ? "Cle JWT anon OK. Verifiez que l utilisateur existe dans CE projet (" +
            projectRef +
            ") : Authentication → Users."
          : "Cle invalide ou trop courte.",
    dashboardUsersUrl: projectRef
      ? `https://supabase.com/dashboard/project/${projectRef}/auth/users`
      : null,
  });
}
