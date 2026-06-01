"use client";

import { useSearchParams } from "next/navigation";
import { AlertCircle } from "lucide-react";

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
    <div className="login-alert login-alert-warn mx-7 mt-5 flex items-start gap-2" role="status">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <span>{message}</span>
    </div>
  );
}
