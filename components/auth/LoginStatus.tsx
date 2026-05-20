"use client";

import { useEffect, useState } from "react";

type Health = {
  ok: boolean;
  supabaseConfigured: boolean;
  siteUrl: string;
};

export function LoginStatus() {
  const [health, setHealth] = useState<Health | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((data: Health) => {
        setHealth(data);
        setErr(null);
      })
      .catch(() => setErr("Serveur non démarré — lancez FAIRE-TOUT.bat ou npm run dev"));
  }, []);

  if (err) {
    return (
      <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
        {err}
      </p>
    );
  }

  if (!health) {
    return <p className="text-center text-xs text-muted">Verification du serveur…</p>;
  }

  if (!health.supabaseConfigured) {
    return (
      <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
        Supabase non configuré (.env.local ou variables Vercel manquantes).
      </p>
    );
  }

  return (
    <p className="text-center text-xs text-emerald-400/90">
      Serveur OK · Supabase connecté
    </p>
  );
}
