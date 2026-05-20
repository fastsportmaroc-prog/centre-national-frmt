import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getSiteUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({
    ok: true,
    supabaseConfigured: isSupabaseConfigured(),
    siteUrl: getSiteUrl(),
    vercel: Boolean(process.env.VERCEL),
  });
}
