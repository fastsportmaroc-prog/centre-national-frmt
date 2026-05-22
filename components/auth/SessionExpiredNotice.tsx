"use client";

import { useSearchParams } from "next/navigation";

export function SessionExpiredNotice() {
  const params = useSearchParams();
  if (params.get("reason") !== "session_expired") return null;

  return (
    <p className="mx-4 mb-2 rounded border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
      Session precedente expiree. Les anciens tokens ont ete supprimes — reconnectez-vous.
    </p>
  );
}
