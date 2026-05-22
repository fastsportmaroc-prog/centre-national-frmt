import { NextResponse } from "next/server";
import { purgeSupabaseAuthServer } from "@/lib/auth/purge-session.server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Purge session Supabase (cookies + signOut) — appelé quand refresh token invalide. */
export async function POST() {
  await purgeSupabaseAuthServer();
  return NextResponse.json({ ok: true, cleared: true });
}
