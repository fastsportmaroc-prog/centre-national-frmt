"use client";

import { useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Label } from "@/components/ui/Input";
import {
  initialAuthState,
  loginAction,
  signupAction,
} from "@/lib/auth/actions";

type Props = {
  projectRef: string;
  configured: boolean;
};

export function LoginForm({ projectRef, configured }: Props) {
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/dashboard";
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
      <Card className="p-4 text-center text-sm text-red-400">
        <p className="font-medium">Configuration manquante</p>
        <p className="mt-2 text-muted">
          Creez .env.local avec NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY
          (cle eyJ..., pas sb_publishable).
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <p className="border-b border-border px-4 py-2 text-center text-xs text-muted">
        Projet Supabase : <span className="text-frmt-green">{projectRef}</span>
      </p>

      <div className="flex border-b border-border">
        <button
          type="button"
          onClick={() => setMode("login")}
          className={`flex-1 py-2 text-sm ${mode === "login" ? "bg-frmt-green/20 font-medium" : "text-muted"}`}
        >
          Connexion
        </button>
        <button
          type="button"
          onClick={() => setMode("signup")}
          className={`flex-1 py-2 text-sm ${mode === "signup" ? "bg-frmt-green/20 font-medium" : "text-muted"}`}
        >
          Creer un compte
        </button>
      </div>

      <form action={formAction} className="space-y-4 p-4">
        <input type="hidden" name="redirect" value={redirect} />

        {mode === "signup" && (
          <div>
            <Label htmlFor="fullName">Nom</Label>
            <Input id="fullName" name="fullName" />
          </div>
        )}

        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required autoComplete="email" />
        </div>

        <div>
          <Label htmlFor="password">Mot de passe</Label>
          <Input
            id="password"
            name="password"
            type="password"
            required
            minLength={6}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
          />
        </div>

        {state.error && (
          <p className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {state.error}
          </p>
        )}
        {state.message && (
          <p className="rounded border border-frmt-green/40 bg-frmt-green/10 px-3 py-2 text-sm text-frmt-green">
            {state.message}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Connexion..." : mode === "login" ? "Se connecter" : "Creer le compte"}
        </Button>
      </form>
    </Card>
  );
}
