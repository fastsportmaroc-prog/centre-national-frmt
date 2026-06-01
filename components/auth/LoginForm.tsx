"use client";

import { useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Lock } from "lucide-react";
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
        <Lock className="mx-auto mb-4 h-7 w-7 text-neutral-300" strokeWidth={1.5} />
        <p className="font-medium text-neutral-800">Service indisponible</p>
        <p className="mt-2 text-sm text-neutral-500">
          {isProd ? "Contactez l'administrateur FRMT." : "Configurez Supabase dans .env.local."}
        </p>
      </div>
    );
  }

  return (
    <div className="login-v3-form px-7 pb-8 pt-2 sm:px-9">
      <div className="login-v3-tabs mb-6 flex border-b border-neutral-200">
        {(["login", "signup"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setMode(tab)}
            className={cn(
              "login-v3-tab flex-1 pb-3 text-sm font-medium transition-colors",
              mode === tab
                ? "login-v3-tab--active text-[var(--frmt-green)]"
                : "text-neutral-400 hover:text-neutral-600"
            )}
          >
            {tab === "login" ? "Connexion" : "Inscription"}
          </button>
        ))}
      </div>

      {!isProd && projectRef && (
        <p className="mb-4 text-[10px] uppercase tracking-widest text-neutral-300">
          dev · {projectRef}
        </p>
      )}

      <form action={formAction} className="space-y-5">
        <input type="hidden" name="redirect" value={redirect} />

        {mode === "signup" && (
          <div>
            <Label htmlFor="fullName" className="login-v3-label">
              Nom complet
            </Label>
            <Input
              id="fullName"
              name="fullName"
              placeholder="Prénom Nom"
              autoComplete="name"
              className="login-v3-input"
            />
          </div>
        )}

        <div>
          <Label htmlFor="email" className="login-v3-label">
            Adresse email
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="nom@frmt.ma"
            className="login-v3-input"
          />
        </div>

        <div>
          <Label htmlFor="password" className="login-v3-label">
            Mot de passe
          </Label>
          <Input
            id="password"
            name="password"
            type="password"
            required
            minLength={6}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            placeholder="••••••••"
            className="login-v3-input"
          />
        </div>

        {state.error && (
          <div className="login-v3-alert login-v3-alert--error" role="alert">
            {state.error}
          </div>
        )}
        {state.message && (
          <div className="login-v3-alert login-v3-alert--success" role="status">
            {state.message}
          </div>
        )}

        <Button type="submit" className="login-v3-btn w-full" disabled={pending}>
          {pending ? (
            <span className="flex items-center justify-center gap-2">
              <span className="login-v3-spinner" aria-hidden />
              Connexion…
            </span>
          ) : mode === "login" ? (
            "Se connecter"
          ) : (
            "Créer le compte"
          )}
        </Button>
      </form>
    </div>
  );
}
