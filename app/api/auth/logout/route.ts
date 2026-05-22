import { NextResponse } from "next/server";
import { purgeSupabaseAuthServer } from "@/lib/auth/purge-session.server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  await purgeSupabaseAuthServer();
  return NextResponse.json({ ok: true });
}
