import { NextResponse } from "next/server";
import { getAuthUserFromServer } from "@/lib/auth/server-session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const user = await getAuthUserFromServer();

  if (!user) {
    return NextResponse.json(
      { user: null, sessionExpired: false },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  }

  return NextResponse.json(
    { user, sessionExpired: false },
    { headers: { "Cache-Control": "no-store" } }
  );
}
