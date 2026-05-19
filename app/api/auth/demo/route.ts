import { clearMockAuth, setMockAuth } from "@/lib/supabase/middleware";
import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  setMockAuth(response);
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  clearMockAuth(response);
  return response;
}
