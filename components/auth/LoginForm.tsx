"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Label } from "@/components/ui/Input";
import { signIn, signUp } from "@/lib/auth/session";

type Props = {
  supabaseConfigured: boolean;
};

export function LoginForm({ supabaseConfigured }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/dashboard";

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      if (mode === "login") {
        await signIn(email, password);
      } else {
        await signUp(email, password, fullName);
        setMessage("Compte créé. Vérifiez votre email si la confirmation est activée.");
        setLoading(false);
        return;
      }
      router.push(redirect);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de connexion");
    } finally {
      setLoading(false);
    }
  }

  if (!supabaseConfigured) {
    return (
      <Card>
        <div className="space-y-4 text-center p-2">
          <p className="text-sm text-muted">
            Supabase n&apos;est pas configuré. Ajoutez{" "}
            <code className="text-frmt-green">NEXT_PUBLIC_SUPABASE_URL</code> et{" "}
            <code className="text-frmt-green">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> dans{" "}
            <code>.env.local</code>.
          </p>
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
