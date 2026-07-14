import { isProductionRuntime } from "@/lib/env/runtime";
import { SUPABASE_NOT_CONFIGURED_MESSAGE } from "@/lib/supabase/assert-configured";

/** Messages clairs pour les erreurs Supabase Auth (FR). */
export function mapAuthErrorMessage(message: string, code?: string): string {
  const isProd = isProductionRuntime();
  const m = message.toLowerCase();
  const c = (code ?? "").toLowerCase();

  if (m.includes("supabase non configuré")) {
    return isProd
      ? "Service d'authentification indisponible. Contactez l'administrateur."
      : SUPABASE_NOT_CONFIGURED_MESSAGE;
  }
  if (c === "email_not_confirmed" || m.includes("email not confirmed")) {
    return isProd
      ? "Veuillez confirmer votre adresse email avant de vous connecter."
      : "Email non confirmé. Supabase → Authentication → Users → confirmez l'utilisateur, ou désactivez « Confirm email » dans Providers → Email.";
  }
  if (c === "config" || m.includes("clé anon pour le projet")) {
    return message;
  }
  if (m.includes("invalid login") || m.includes("invalid credentials")) {
    return isProd
      ? "Email ou mot de passe incorrect."
      : "Connexion refusée. Double-cliquez REPARER-ABDOU.bat ou lancez : npm run ensure:user -- abdou@frmt.ma FrmtAbdou2026! puis npm run restart";
  }
  if (m.includes("user already registered")) {
    return "Un compte existe déjà avec cet email.";
  }
  if (m.includes("invalid api key") || m.includes("apikey")) {
    return isProd
      ? "Service temporairement indisponible. Réessayez plus tard."
      : "Clé Supabase invalide. Vérifiez NEXT_PUBLIC_SUPABASE_ANON_KEY dans .env.local.";
  }
  if (m.includes("rate limit")) {
    return "Trop de tentatives. Réessayez dans quelques minutes.";
  }
  return message;
}
