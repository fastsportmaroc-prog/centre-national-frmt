import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseEnv, isSupabaseConfigured } from "./config";

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

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  if (!isSupabaseConfigured()) {
    const isAuthRoute = request.nextUrl.pathname.startsWith("/auth");
    const isDemoAuthed = hasMockAuth(request);

    if (!isAuthRoute && !isDemoAuthed && request.nextUrl.pathname !== "/") {
      const url = request.nextUrl.clone();
      url.pathname = "/auth/login";
      return NextResponse.redirect(url);
    }
    return response;
  }

  const { url, anonKey } = getSupabaseEnv();

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthRoute = request.nextUrl.pathname.startsWith("/auth");
  const isPublic =
    request.nextUrl.pathname === "/" || request.nextUrl.pathname.startsWith("/api/auth");

  if (!user && !isAuthRoute && !isPublic) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/auth/login";
    redirectUrl.searchParams.set("redirect", request.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && isAuthRoute && request.nextUrl.pathname === "/auth/login") {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/dashboard";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}
