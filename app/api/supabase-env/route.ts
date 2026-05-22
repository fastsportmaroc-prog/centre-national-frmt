import {
  getSupabasePublicEnv,
  isSupabaseConfigured,
  SUPABASE_ENV,
} from "@/lib/supabase/config";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const configured = isSupabaseConfigured();
  const { url, anonKey } = getSupabasePublicEnv();

  return Response.json({
    configured,
    envKeys: {
      url: SUPABASE_ENV.URL,
      anonKey: SUPABASE_ENV.ANON_KEY,
    },
    url: configured ? url : null,
    anonKey: configured ? anonKey : null,
  });
}
