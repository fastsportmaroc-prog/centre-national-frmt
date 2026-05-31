"use client";

import { useEffect, useState } from "react";
import { isLocalFallbackMode } from "@/lib/supabase/client";

export function LocalModeBadge() {
  const [local, setLocal] = useState(false);

  useEffect(() => {
    setLocal(isLocalFallbackMode());
  }, []);

  if (!local) return null;

  return (
    <span className="fixed bottom-4 right-4 z-50 rounded-full border border-amber-500/40 bg-amber-500/15 px-3 py-1 text-xs font-medium text-amber-200 shadow-lg">
      Mode local (Supabase indisponible)
    </span>
  );
}
