/** Statuts d’expiration — passeports & visas */

export type DocumentExpirationStatus =
  | "expire"
  | "urgent"
  | "a_renouveler"
  | "valide"
  | "inconnu";

export const DOCUMENT_STATUS_LABELS: Record<DocumentExpirationStatus, string> = {
  expire: "Expiré",
  urgent: "Urgent",
  a_renouveler: "À renouveler",
  valide: "Valide",
  inconnu: "Non renseigné",
};

function parseDateOnly(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(y!, m! - 1, d!);
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function daysUntil(expirationDate: string, refDate: Date): number {
  const exp = parseDateOnly(expirationDate);
  const today = startOfDay(refDate);
  return Math.floor((startOfDay(exp).getTime() - today.getTime()) / 86400000);
}

/**
 * - Expiré : date < aujourd’hui
 * - Urgent : expiration dans moins de 30 jours
 * - À renouveler : expiration dans moins de 6 mois
 * - Valide : sinon
 */
export function getDocumentExpirationStatus(
  expirationDate: string | null | undefined,
  refDate: Date = new Date()
): DocumentExpirationStatus {
  if (!expirationDate?.trim()) return "inconnu";
  const days = daysUntil(expirationDate, refDate);
  if (days < 0) return "expire";
  if (days <= 30) return "urgent";
  if (days <= 183) return "a_renouveler";
  return "valide";
}

export function documentStatusBadgeClass(status: DocumentExpirationStatus): string {
  switch (status) {
    case "expire":
      return "bg-red-500/20 text-red-400 border-red-500/40";
    case "urgent":
      return "bg-orange-500/20 text-orange-400 border-orange-500/40";
    case "a_renouveler":
      return "bg-amber-500/20 text-amber-300 border-amber-500/40";
    case "valide":
      return "bg-emerald-500/20 text-emerald-400 border-emerald-500/40";
    default:
      return "bg-zinc-500/20 text-zinc-400 border-zinc-500/40";
  }
}
