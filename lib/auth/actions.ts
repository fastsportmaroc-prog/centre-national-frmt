"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { mapAuthErrorMessage } from "@/lib/auth/errors";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AuthFormState = {
  error: string | null;
  message: string | null;
};

export const initialAuthState: AuthFormState = { error: null, message: null };

async function signInEmailPassword(email: string, password: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return { error: { message: "Supabase indisponible", code: "config" } as const, session: null };
  }

  const attempts = [email.trim(), email.trim().toLowerCase()].filter(
    (e, i, a) => a.indexOf(e) === i
  );

  for (const attemptEmail of attempts) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: attemptEmail,
      password,
    });
    if (!error && data.session) {
      await supabase.rpc("ensure_my_profile");
      return { error: null, session: data.session };
    }
    if (error) {
      const last = error;
      const retryable =
        last.message.toLowerCase().includes("invalid login") ||
        last.message.toLowerCase().includes("invalid credentials");
      if (!retryable) return { error: last, session: null };
      if (attemptEmail === attempts[attempts.length - 1]) {
        return { error: last, session: null };
      }
    }
  }

  return { error: { message: "Connexion impossible", code: "auth" }, session: null };
}

export async function loginAction(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  if (!isSupabaseConfigured()) {
    return {
      error:
        "Fichier .env.local manquant ou incomplet. Utilisez la cle anon eyJ... (Supabase → Settings → API).",
      message: null,
    };
  }

  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const redirectTo = String(formData.get("redirect") ?? "/dashboard");

  if (!email.trim() || !password) {
    return { error: "Email et mot de passe requis.", message: null };
  }

  const { error } = await signInEmailPassword(email, password);

  if (error) {
    return {
      error: mapAuthErrorMessage(error.message, error.code),
      message: null,
    };
  }

  revalidatePath("/", "layout");
  redirect(redirectTo.startsWith("/") ? redirectTo : "/dashboard");
}

export async function signupAction(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  if (!isSupabaseConfigured()) {
    return { error: "Supabase non configure.", message: null };
  }

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("fullName") ?? "").trim();

  if (!email || !password) {
    return { error: "Email et mot de passe requis.", message: null };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return { error: "Supabase indisponible.", message: null };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });

  if (error) {
    return { error: mapAuthErrorMessage(error.message, error.code), message: null };
  }

  if (data.session) {
    revalidatePath("/", "layout");
    redirect("/dashboard");
  }

  return {
    error: null,
    message: "Compte cree. Connectez-vous (ou confirmez l email dans Supabase si demande).",
  };
}

export async function logoutAction(): Promise<void> {
  const { purgeSupabaseAuthServer } = await import("@/lib/auth/purge-session.server");
  await purgeSupabaseAuthServer();
  revalidatePath("/", "layout");
  redirect("/auth/login");
}
