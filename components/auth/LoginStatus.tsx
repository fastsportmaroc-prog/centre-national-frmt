"use client";

import { useEffect, useState } from "react";
import { isProductionRuntime } from "@/lib/env/runtime";

export function LoginStatus() {
  const isProd = isProductionRuntime();
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [devHint, setDevHint] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/health", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { supabaseConfigured?: boolean; hint?: string }) => {
        if (!d.supabaseConfigured) {
          setStatus("error");
          setDevHint(d.hint ?? null);
          return;
        }
        setStatus("ok");
        setDevHint(d.hint ?? null);
      })
      .catch(() => {
        setStatus("error");
        setDevHint("Lancez npm run dev:3001 puis ouvrez http://localhost:3001");
      });
  }, []);

  if (status === "loading") {
    if (isProd) return null;
    return <p className="text-center text-xs text-muted">Vérification du serveur…</p>;
  }

  if (status === "error") {
    return (
      <p className="mx-6 mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
        {isProd
          ? "Service temporairement indisponible. Réessayez dans quelques instants ou contactez l'administrateur."
          : (devHint ?? "Serveur ou Supabase non prêt.")}
      </p>
    );
  }

  if (isProd) return null;

  return (
    <p className="text-center text-xs text-emerald-400">
      Serveur OK · Supabase connecté
      {devHint ? ` — ${devHint}` : ""}
    </p>
  );
}
