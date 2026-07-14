import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { CookieToSet } from "./cookies";
import { getSupabasePublicEnv, isSupabaseConfigured } from "./config";
import { isInvalidRefreshTokenError } from "@/lib/auth/session-errors";

const MOCK_AUTH_COOKIE = "tcp_demo_auth";

export function hasMockAuth(request: NextRequest) {
  return request.cookies.get(MOCK_AUTH_COOKIE)?.value === "1";
}

export function setMockAuth(response: NextResponse) {
  response.cookies.set(MOCK_AUTH_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export function clearMockAuth(response: NextResponse) {
  response.cookies.delete(MOCK_AUTH_COOKIE);
}

function redirectLoginWithClearedCookies(
  request: NextRequest,
  sessionResponse: NextResponse
) {
  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = "/auth/login";
  redirectUrl.searchParams.set("reason", "session_expired");
  const redirect = NextResponse.redirect(redirectUrl);
  sessionResponse.cookies.getAll().forEach((cookie) => {
    redirect.cookies.set(cookie.name, cookie.value, cookie);
  });
  return redirect;
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  if (!isSupabaseConfigured()) {
    const isAuthRoute = request.nextUrl.pathname.startsWith("/auth");
    const isDemoAuthed = hasMockAuth(request);

    const isApi =
      request.nextUrl.pathname.startsWith("/api/auth") ||
      request.nextUrl.pathname === "/api/health" ||
      request.nextUrl.pathname === "/api/status";
    if (!isAuthRoute && !isDemoAuthed && request.nextUrl.pathname !== "/" && !isApi) {
      const url = request.nextUrl.clone();
      url.pathname = "/auth/login";
      return NextResponse.redirect(url);
    }
    return response;
  }

  const { url, anonKey } = getSupabasePublicEnv();

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const isAuthRoute = request.nextUrl.pathname.startsWith("/auth");
  const isPublic =
    request.nextUrl.pathname === "/" ||
    request.nextUrl.pathname.startsWith("/api/auth") ||
    request.nextUrl.pathname === "/api/health" ||
    request.nextUrl.pathname === "/api/status" ||
    request.nextUrl.pathname === "/api/stages/count" ||
    request.nextUrl.pathname.startsWith("/api/frmt-logo") ||
    (process.env.NODE_ENV !== "production" &&
      request.nextUrl.pathname.startsWith("/api/dev"));

  let user = null;

  try {
    const {
      data: { user: authUser },
      error,
    } = await supabase.auth.getUser();

    if (error && isInvalidRefreshTokenError(error)) {
      await supabase.auth.signOut();
      if (!isPublic && !isAuthRoute) {
        return redirectLoginWithClearedCookies(request, response);
      }
    } else {
      user = authUser;
    }
  } catch (error) {
    if (isInvalidRefreshTokenError(error)) {
      try {
        await supabase.auth.signOut();
      } catch {
        /* ignore */
      }
      if (!isPublic && !isAuthRoute) {
        return redirectLoginWithClearedCookies(request, response);
      }
    }
  }

  if (!user && !isAuthRoute && !isPublic) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/auth/login";
    redirectUrl.searchParams.set("redirect", request.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && isAuthRoute && request.nextUrl.pathname === "/auth/login") {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/v2/dashboard";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}
