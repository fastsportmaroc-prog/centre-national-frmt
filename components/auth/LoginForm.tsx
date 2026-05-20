"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Label } from "@/components/ui/Input";
import { mapAuthErrorMessage } from "@/lib/auth/errors";
import { signIn, signUp } from "@/lib/auth/session";
import { isSupabaseConfigured, SUPABASE_ENV } from "@/lib/supabase/config";

type HealthPayload = {
  supabaseConfigured: boolean;
  hint?: string | null;
  diagnostics?: {
    hasUrl: boolean;
    hasAnonKey: boolean;
    keyLength: number;
  };
};

export function LoginForm() {
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/dashboard";

  const [configReady, setConfigReady] = useState(false);
  const [supabaseOk, setSupabaseOk] = useState(false);
  const [configHint, setConfigHint] = useState<string | null>(null);

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/health", { cache: "no-store" })
      .then((r) => r.json())
      .then((data: HealthPayload) => {
        setSupabaseOk(Boolean(data.supabaseConfigured));
        setConfigHint(data.hint ?? null);
        setConfigReady(true);
      })
      .catch(() => {
        const fallback = isSupabaseConfigured();
        setSupabaseOk(fallback);
        setConfigHint(
          fallback
            ? null
            : `Impossible de joindre /api/health. Vérifiez ${SUPABASE_ENV.URL} et ${SUPABASE_ENV.ANON_KEY} sur Vercel puis Redeploy.`
        );
        setConfigReady(true);
      });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      if (mode === "login") {
        await signIn(email, password);
        window.location.href = redirect.startsWith("/") ? redirect : "/dashboard";
        return;
      }
      await signUp(email, password, fullName);
      setMessage("Compte créé. Vérifiez votre email si la confirmation est activée.");
      setLoading(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur de connexion";
      setError(mapAuthErrorMessage(msg));
    } finally {
      setLoading(false);
    }
  }

  if (!configReady) {
    return (
      <p className="p-4 text-center text-sm text-muted">Vérification Supabase…</p>
    );
  }

  if (!supabaseOk) {
    return (
      <Card>
        <div className="space-y-4 p-4 text-center">
          <p className="text-sm font-medium text-foreground">Supabase non configuré</p>
          <p className="text-sm text-muted">
            {configHint ??
              `Ajoutez ${SUPABASE_ENV.URL} et ${SUPABASE_ENV.ANON_KEY} sur Vercel (Production), puis Redeploy sans cache.`}
          </p>
          <ul className="mt-2 space-y-1 text-left text-xs text-muted">
            <li>
              <code className="text-frmt-green">{SUPABASE_ENV.URL}</code>
            </li>
            <li>
              <code className="text-frmt-green">{SUPABASE_ENV.ANON_KEY}</code>
            </li>
          </ul>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === "signup" && (
          <div>
            <Label htmlFor="fullName">Nom complet</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>
        )}
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>
        <div>
          <Label htmlFor="password">Mot de passe</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
          />
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        {message && <p className="text-sm text-tennis">{message}</p>}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading
            ? "Chargement…"
            : mode === "login"
              ? "Se connecter"
              : "Créer un compte"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="w-full"
          onClick={() => setMode(mode === "login" ? "signup" : "login")}
        >
          {mode === "login"
            ? "Pas de compte ? S'inscrire"
            : "Déjà un compte ? Se connecter"}
        </Button>
      </form>
    </Card>
  );
}
