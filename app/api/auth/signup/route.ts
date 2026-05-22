import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { mapAuthErrorMessage } from "@/lib/auth/errors";
import { isSupabaseConfigured, getSupabasePublicEnv } from "@/lib/supabase/config";
import type { CookieToSet } from "@/lib/supabase/cookies";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const loginUrl = new URL("/auth/login", request.url);

  if (!isSupabaseConfigured()) {
    loginUrl.searchParams.set("error", "Supabase non configure");
    return NextResponse.redirect(loginUrl);
  }

  const formData = await request.formData();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("fullName") ?? "").trim();

  if (!email || !password) {
    loginUrl.searchParams.set("error", "Email et mot de passe requis");
    return NextResponse.redirect(loginUrl);
  }

  const { url, anonKey } = getSupabasePublicEnv();
  const cookieStore = await cookies();

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      },
    },
  });

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });

  if (error) {
    loginUrl.searchParams.set("error", mapAuthErrorMessage(error.message, error.code));
    return NextResponse.redirect(loginUrl);
  }

  if (data.session) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  loginUrl.searchParams.set("message", "compte_cree");
  return NextResponse.redirect(loginUrl);
}
