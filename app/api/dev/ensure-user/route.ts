import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { repairAuthAccount } from "@/lib/auth/repair-account.server";
import { getServerSupabaseEnv, validateSupabaseEnvMatch } from "@/lib/supabase/server-env";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Dev uniquement — répare un compte et teste le login.
 * http://localhost:3000/api/dev/ensure-user?email=abdou@frmt.ma&password=FrmtAbdou2026!
 */
export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false, message: "Non disponible" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const email = (searchParams.get("email") ?? "abdou@frmt.ma").trim().toLowerCase();
  const password = searchParams.get("password") ?? "FrmtAbdou2026!";

  const { url, anonKey } = getServerSupabaseEnv();
  const envError = validateSupabaseEnvMatch(url, anonKey);
  if (envError) {
    return NextResponse.json({ ok: false, message: envError }, { status: 400 });
  }

  const repair = await repairAuthAccount(email, password, {
    role: "admin",
    frmtRole: "admin",
    fullName: "Abdou",
  });

  if (!repair.ok) {
    return NextResponse.json(repair, { status: 400 });
  }

  const pub = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error: loginError } = await pub.auth.signInWithPassword({ email, password });

  return NextResponse.json({
    ...repair,
    loginTest: loginError ? { ok: false, message: loginError.message } : { ok: true },
    connect: {
      url: "http://localhost:3000/auth/login",
      email,
      password,
    },
  });
}
