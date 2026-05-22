"use client";

import { useEffect, useState } from "react";

export function LoginStatus() {
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [hint, setHint] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/health", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: {
        supabaseConfigured?: boolean;
        authKeyOk?: boolean;
        hint?: string;
      }) => {
        if (!d.supabaseConfigured) {
          setStatus("error");
          setHint(d.hint ?? null);
          return;
        }
        setStatus("ok");
        setHint(d.hint ?? null);
      })
      .catch(() => {
        setStatus("error");
        setHint("Lancez DEMARRER.bat puis ouvrez http://localhost:3001");
      });
  }, []);

  if (status === "loading") {
    return <p className="text-center text-xs text-muted">Verification serveur...</p>;
  }

  if (status === "error") {
    return (
      <p className="rounded border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
        {hint ?? "Serveur ou Supabase non pret"}
      </p>
    );
  }

  return (
    <p className="text-center text-xs text-emerald-400">Serveur OK · Supabase connecte</p>
  );
}
