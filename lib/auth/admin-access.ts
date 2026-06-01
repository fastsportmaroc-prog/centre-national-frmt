import type { AuthUser } from "@/lib/types/auth";

/** Emails toujours traités comme administrateur (Paramètres, invitations, écriture RLS). */
export const DEFAULT_SUPERADMIN_EMAILS = [
  "s.abderrazzaq@frmt.ma",
  "m.aitbarhouch@frmt.ma",
  "admin@frmt.ma",
  "directeur@frmt.ma",
] as const;

function superAdminEmails(): Set<string> {
  const fromEnv = (process.env.FRMT_ADMIN_EMAILS ?? "")
    .split(/[,;\s]+/)
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return new Set([...DEFAULT_SUPERADMIN_EMAILS.map((e) => e.toLowerCase()), ...fromEnv]);
}

export function isFrmtSuperAdminEmail(email: string | null | undefined): boolean {
  if (!email?.trim()) return false;
  return superAdminEmails().has(email.trim().toLowerCase());
}

/** Vrai si l'utilisateur doit avoir les droits admin applicatifs. */
export function authUserIsAppAdmin(user: AuthUser): boolean {
  if (user.appRole === "admin") return true;
  if (user.role === "admin" || user.frmtRole === "admin") return true;
  return isFrmtSuperAdminEmail(user.email);
}
