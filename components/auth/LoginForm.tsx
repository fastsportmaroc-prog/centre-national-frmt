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
      <div className="px-8 py-14 text-center">
        <Lock className="mx-auto mb-4 h-7 w-7 text-white/30" strokeWidth={1.5} />
        <p className="font-medium text-white/90">Service indisponible</p>
        <p className="mt-2 text-sm text-white/45">
          {isProd ? "Contactez l'administrateur FRMT." : "Configurez Supabase dans .env.local."}
        </p>
      </div>
    );
  }

  return (
    <div className="login-form-body px-7 pb-8 pt-7 sm:px-9">
      <div className="login-tabs mb-7 flex gap-1 rounded-sm border border-white/[0.06] bg-black/20 p-1">
        {(["login", "signup"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setMode(tab)}
            className={cn(
              "login-tab flex-1 rounded-sm py-2.5 text-[13px] transition-all duration-200",
              mode === tab
                ? "login-tab--active bg-white/[0.07] text-white shadow-sm"
                : "text-white/40 hover:text-white/60"
            )}
          >
            {tab === "login" ? "Connexion" : "Inscription"}
          </button>
        ))}
      </div>

      {!isProd && projectRef && (
        <p className="mb-5 text-[10px] uppercase tracking-[0.2em] text-white/25">dev · {projectRef}</p>
      )}

      <form action={formAction} className="space-y-6">
        <input type="hidden" name="redirect" value={redirect} />

        {mode === "signup" && (
          <div className="login-field-art">
            <Label htmlFor="fullName" className="login-label-art">
              Nom complet
            </Label>
            <Input
              id="fullName"
              name="fullName"
              placeholder="Prénom Nom"
              autoComplete="name"
              className="login-input-art"
            />
          </div>
        )}

        <div className="login-field-art">
          <Label htmlFor="email" className="login-label-art">
            Adresse email
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="nom@frmt.ma"
            className="login-input-art"
          />
        </div>

        <div className="login-field-art">
          <Label htmlFor="password" className="login-label-art">
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
            className="login-input-art"
          />
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

        <Button type="submit" className="login-btn-art w-full" disabled={pending}>
          {pending ? (
            <span className="flex items-center justify-center gap-2">
              <span className="login-spinner" aria-hidden />
              Connexion…
            </span>
          ) : mode === "login" ? (
            "Entrer"
          ) : (
            "Créer le compte"
          )}
        </Button>
      </form>
    </div>
  );
}
