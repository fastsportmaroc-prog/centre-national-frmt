import { getAuthUserFromServer } from "@/lib/auth/server-session";
import {
  getSupabaseEnvDiagnostics,
  getSupabasePublicEnv,
  isSupabaseConfigured,
} from "@/lib/supabase/config";
import { readSupabaseEnvFromFile } from "@/lib/supabase/env-file";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const diagnostics = getSupabaseEnvDiagnostics();
  const configured = isSupabaseConfigured();
  const file = readSupabaseEnvFromFile();
  let user = null;
  let authError: string | null = null;

  try {
    user = await getAuthUserFromServer();
  } catch (e) {
    authError = e instanceof Error ? e.message : "Erreur session";
  }

  const { anonKey } = getSupabasePublicEnv();

  return Response.json({
    ok: true,
    localUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001",
    loginUrl: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001"}/auth/login`,
    supabase: {
      configured,
      diagnostics,
      keyPrefix: anonKey ? `${anonKey.slice(0, 14)}…` : null,
      fileEnvPresent: Boolean(file.url && file.anonKey),
      serviceRoleConfigured: Boolean(file.serviceRole?.startsWith("eyJ")),
    },
    session: {
      loggedIn: Boolean(user),
      email: user?.email ?? null,
      role: user?.frmtRole ?? user?.role ?? null,
      error: authError,
    },
  });
}
