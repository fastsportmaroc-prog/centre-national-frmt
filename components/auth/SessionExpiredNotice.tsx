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
    <div className="login-alert login-alert-warn mx-8 mt-6 text-sm" role="status">
      {message}
    </div>
  );
}
