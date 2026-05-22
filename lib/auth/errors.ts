import { SUPABASE_NOT_CONFIGURED_MESSAGE } from "@/lib/supabase/assert-configured";

/** Messages clairs pour les erreurs Supabase Auth (FR). */
export function mapAuthErrorMessage(message: string, code?: string): string {
  const m = message.toLowerCase();
  const c = (code ?? "").toLowerCase();

  if (m.includes("supabase non configuré")) {
    return SUPABASE_NOT_CONFIGURED_MESSAGE;
  }
  if (c === "email_not_confirmed" || m.includes("email not confirmed")) {
    return "Email non confirme. Supabase → Authentication → Users → ouvrez l'utilisateur → Confirm user. Ou desactivez « Confirm email » dans Providers → Email.";
  }
  if (m.includes("invalid login") || m.includes("invalid credentials")) {
    return "Supabase refuse email/mot de passe pour CE projet. Solutions : (1) Mettre la cle anon eyJ... dans .env.local (pas seulement sb_publishable). (2) Lancer : npm run fix:password -- email@frmt.ma NouveauPass123 (avec SUPABASE_SERVICE_ROLE_KEY dans .env.local). Voir FIX-MOT-DE-PASSE.txt";
  }
  if (m.includes("email not confirmed")) {
    return "Email non confirmé. Dans Supabase : Authentication → Users → confirmez l'utilisateur, ou désactivez « Confirm email » dans Providers → Email.";
  }
  if (m.includes("user already registered")) {
    return "Un compte existe déjà avec cet email.";
  }
  if (m.includes("invalid api key") || m.includes("apikey")) {
    return "Clé Supabase invalide. Vérifiez NEXT_PUBLIC_SUPABASE_ANON_KEY dans .env.local (clé anon / publishable du projet).";
  }
  if (m.includes("rate limit")) {
    return "Trop de tentatives. Réessayez dans quelques minutes.";
  }
  return message;
}
