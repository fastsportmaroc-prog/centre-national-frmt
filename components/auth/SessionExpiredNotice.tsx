"use client";

import { useSearchParams } from "next/navigation";

const SESSION_MESSAGES: Record<string, string> = {
  session_expired: "Votre session a expiré. Veuillez vous reconnecter.",
  logout: "Vous êtes déconnecté. Connectez-vous pour continuer.",
};

export function SessionExpiredNotice() {
  const params = useSearchParams();
  const reason = params.get("reason");
  const message = reason ? SESSION_MESSAGES[reason] : null;
  if (!message) return null;

  return (
    <div
      className="mx-6 mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
      role="status"
    >
      {message}
    </div>
  );
}
