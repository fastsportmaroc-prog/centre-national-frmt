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
    <div className="login-v3-alert login-v3-alert--warn mx-7 mt-5 text-sm sm:mx-9" role="status">
      {message}
    </div>
  );
}
