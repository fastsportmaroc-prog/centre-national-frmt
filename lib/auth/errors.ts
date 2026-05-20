/** Messages clairs pour les erreurs Supabase Auth (FR). */
export function mapAuthErrorMessage(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login") || m.includes("invalid credentials")) {
    return "Email ou mot de passe incorrect.";
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
