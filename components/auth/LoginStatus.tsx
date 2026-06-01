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
    return (
      <p className="login-v3-alert login-v3-alert--warn mx-7 mt-4 text-center text-xs sm:mx-9">
        Vérification du serveur…
      </p>
    );
  }

  if (status === "error") {
    return (
      <div className="login-v3-alert login-v3-alert--error mx-7 mt-4 sm:mx-9" role="alert">
        {isProd
          ? "Service temporairement indisponible. Réessayez dans quelques instants ou contactez l'administrateur."
          : (devHint ?? "Serveur ou Supabase non prêt.")}
      </div>
    );
  }

  if (isProd) return null;

  return (
    <p className="login-v3-alert login-v3-alert--success mx-7 mt-4 text-center text-xs sm:mx-9">
      Serveur OK · Supabase connecté
      {devHint ? ` — ${devHint}` : ""}
    </p>
  );
}
