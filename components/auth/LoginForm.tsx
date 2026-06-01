"use client";

import { useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Lock, Mail, User } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { initialAuthState } from "@/lib/auth/form-state";
import { loginAction, signupAction } from "@/lib/auth/actions";
import { isProductionRuntime } from "@/lib/env/runtime";
import { cn } from "@/lib/utils/cn";

type Props = {
  projectRef?: string;
  configured: boolean;
};

export function LoginForm({ projectRef, configured }: Props) {
  const isProd = isProductionRuntime();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/v2/dashboard";
  const [mode, setMode] = useState<"login" | "signup">("login");

  const [loginState, loginFormAction, loginPending] = useActionState(loginAction, initialAuthState);
  const [signupState, signupFormAction, signupPending] = useActionState(signupAction, initialAuthState);

  const state = mode === "login" ? loginState : signupState;
  const pending = mode === "login" ? loginPending : signupPending;
  const formAction = mode === "login" ? loginFormAction : signupFormAction;

  if (!configured) {
    return (
      <div className="px-8 py-12 text-center">
        <Lock className="mx-auto mb-3 h-8 w-8 text-red-400/80" />
        <p className="font-semibold text-foreground">Connexion indisponible</p>
        <p className="mt-2 text-sm text-muted">
          {isProd
            ? "Contactez l'administrateur du Centre National."
            : "Configurez Supabase dans .env.local."}
        </p>
      </div>
    );
  }

  return (
    <div className="px-7 pb-7 pt-5">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-foreground">
          {mode === "login" ? "Connexion" : "Nouveau compte"}
        </h2>
        <p className="mt-0.5 text-xs text-muted">
          {mode === "login"
            ? "Identifiants professionnels @frmt.ma"
            : "Demande d'accès au portail"}
        </p>
      </div>

      <div className="mb-6 flex rounded-lg bg-black/20 p-1">
        {(["login", "signup"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setMode(tab)}
            className={cn(
              "flex-1 rounded-md py-2 text-sm font-medium transition-all",
              mode === tab
                ? "bg-white/10 text-white shadow-sm"
                : "text-white/45 hover:text-white/70"
            )}
          >
            {tab === "login" ? "Se connecter" : "S'inscrire"}
          </button>
        ))}
      </div>

      {!isProd && projectRef && (
        <p className="mb-4 text-center text-[10px] uppercase tracking-wider text-white/30">
          dev · {projectRef}
        </p>
      )}

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="redirect" value={redirect} />

        {mode === "signup" && (
          <div className="login-field">
            <Label htmlFor="fullName" className="login-label-pro">
              Nom complet
            </Label>
            <div className="login-input-wrap">
              <User className="login-input-icon h-4 w-4" aria-hidden />
              <Input id="fullName" name="fullName" placeholder="Prénom Nom" autoComplete="name" className="login-input-pro pl-10" />
            </div>
          </div>
        )}

        <div className="login-field">
          <Label htmlFor="email" className="login-label-pro">
            Email
          </Label>
          <div className="login-input-wrap">
            <Mail className="login-input-icon h-4 w-4" aria-hidden />
            <Input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="nom@frmt.ma"
              className="login-input-pro pl-10"
            />
          </div>
        </div>

        <div className="login-field">
          <Label htmlFor="password" className="login-label-pro">
            Mot de passe
          </Label>
          <div className="login-input-wrap">
            <Lock className="login-input-icon h-4 w-4" aria-hidden />
            <Input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              placeholder="••••••••"
              className="login-input-pro pl-10"
            />
          </div>
        </div>

        {state.error && (
          <div className="login-alert login-alert-error" role="alert">
            {state.error}
          </div>
        )}
        {state.message && (
          <div className="login-alert login-alert-success" role="status">
            {state.message}
          </div>
        )}

        <Button type="submit" className="login-submit-pro group h-12 w-full" disabled={pending}>
          {pending ? (
            <span className="flex items-center justify-center gap-2">
              <span className="login-spinner" aria-hidden />
              Connexion…
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              {mode === "login" ? "Accéder à la plateforme" : "Créer le compte"}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </span>
          )}
        </Button>
      </form>
    </div>
  );
}
