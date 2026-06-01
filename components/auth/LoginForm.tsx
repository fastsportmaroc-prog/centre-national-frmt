"use client";

import { useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";
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

  const [loginState, loginFormAction, loginPending] = useActionState(
    loginAction,
    initialAuthState
  );
  const [signupState, signupFormAction, signupPending] = useActionState(
    signupAction,
    initialAuthState
  );

  const state = mode === "login" ? loginState : signupState;
  const pending = mode === "login" ? loginPending : signupPending;
  const formAction = mode === "login" ? loginFormAction : signupFormAction;

  if (!configured) {
    return (
      <div className="px-6 py-8 text-center text-sm">
        <p className="font-medium text-red-400">Connexion indisponible</p>
        <p className="mt-2 text-muted">
          {isProd
            ? "Le service d'authentification n'est pas disponible. Contactez l'administrateur FRMT."
            : "Créez .env.local avec NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY (clé anon eyJ…, pas seulement sb_publishable)."}
        </p>
      </div>
    );
  }

  return (
    <div className="px-6 pb-6 pt-2">
      {!isProd && projectRef && (
        <p className="mb-4 text-center text-[11px] text-muted">
          Projet Supabase (dev) : <span className="text-frmt-green">{projectRef}</span>
        </p>
      )}

      <div className="mb-6 flex rounded-lg border border-border bg-surface-elevated/50 p-1">
        <button
          type="button"
          onClick={() => setMode("login")}
          className={cn(
            "flex-1 rounded-md py-2.5 text-sm font-medium transition-colors",
            mode === "login"
              ? "bg-frmt-green text-white shadow-sm"
              : "text-muted hover:text-foreground"
          )}
        >
          Connexion
        </button>
        <button
          type="button"
          onClick={() => setMode("signup")}
          className={cn(
            "flex-1 rounded-md py-2.5 text-sm font-medium transition-colors",
            mode === "signup"
              ? "bg-frmt-green text-white shadow-sm"
              : "text-muted hover:text-foreground"
          )}
        >
          Créer un compte
        </button>
      </div>

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="redirect" value={redirect} />

        {mode === "signup" && (
          <div>
            <Label htmlFor="fullName">Nom complet</Label>
            <Input id="fullName" name="fullName" placeholder="Prénom Nom" autoComplete="name" />
          </div>
        )}

        <div>
          <Label htmlFor="email">Adresse email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="nom@frmt.ma"
          />
        </div>

        <div>
          <Label htmlFor="password">Mot de passe</Label>
          <Input
            id="password"
            name="password"
            type="password"
            required
            minLength={6}
            autoComplete={mode === "login" ? "current-password" : "new-password"
            }
            placeholder="••••••••"
          />
        </div>

        {state.error && (
          <p
            className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2.5 text-sm text-red-300"
            role="alert"
          >
            {state.error}
          </p>
        )}
        {state.message && (
          <p
            className="rounded-lg border border-frmt-green/40 bg-frmt-green/10 px-3 py-2.5 text-sm text-frmt-green"
            role="status"
          >
            {state.message}
          </p>
        )}

        <Button type="submit" className="h-11 w-full text-base" disabled={pending}>
          {pending
            ? "Connexion en cours…"
            : mode === "login"
              ? "Se connecter"
              : "Créer le compte"}
        </Button>
      </form>
    </div>
  );
}
