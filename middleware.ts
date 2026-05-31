import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { resolveV2Redirect } from "@/lib/v2/v1-to-v2-redirect";

export async function middleware(request: NextRequest) {
  const v2Target = resolveV2Redirect(
    request.nextUrl.pathname,
    request.nextUrl.search
  );
  if (v2Target) {
    return NextResponse.redirect(new URL(v2Target, request.url));
  }

  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
