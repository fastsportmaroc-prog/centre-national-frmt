import type { DossierPasseportWithJoueur } from "@/lib/types/passeport";

/** Seuil d'alerte passeport : expiration dans les 6 prochains mois */
export const PASSPORT_ALERT_MONTHS = 6;

/** Seuil d'alerte visa : expiration dans les 2 prochains mois */
export const VISA_ALERT_MONTHS = 2;

export type PasseportAlerteSeverite = "expire" | "bientot";

export type PasseportAlerte = {
  id: string;
  type: "passeport" | "visa";
  severite: PasseportAlerteSeverite;
  joueur_id: string;
  joueur_nom: string;
  message: string;
  date_echeance: string;
  jours_restants: number;
  pays?: string;
  visa_id?: string;
};

function parseDateOnly(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(y!, m! - 1, d!);
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function daysBetween(from: Date, to: Date): number {
  const ms = startOfDay(to).getTime() - startOfDay(from).getTime();
  return Math.round(ms / (24 * 60 * 60 * 1000));
}

export type ExpirationAlertLevel = "expire" | "bientot" | null;

/** Passeport : alerte si expiration ≤ 6 mois */
export function getPasseportExpirationAlert(
  dateExpiration: string | null,
  refDate: Date = new Date()
): ExpirationAlertLevel {
  if (!dateExpiration?.trim()) return null;
  const exp = parseDateOnly(dateExpiration);
  const today = startOfDay(refDate);
  if (exp < today) return "expire";
  const limite = addMonths(today, PASSPORT_ALERT_MONTHS);
  if (exp <= limite) return "bientot";
  return null;
}

/** Visa : alerte si date de fin ≤ 2 mois */
export function getVisaExpirationAlert(
  dateFin: string | null,
  refDate: Date = new Date()
): ExpirationAlertLevel {
  if (!dateFin?.trim()) return null;
  const exp = parseDateOnly(dateFin);
  const today = startOfDay(refDate);
  if (exp < today) return "expire";
  const limite = addMonths(today, VISA_ALERT_MONTHS);
  if (exp <= limite) return "bientot";
  return null;
}

function joueurNom(d: DossierPasseportWithJoueur): string {
  if (d.joueur) return `${d.joueur.prenom} ${d.joueur.nom}`;
  return `Joueur ${d.joueur_id}`;
}

export function buildPasseportVisaAlertes(
  dossiers: DossierPasseportWithJoueur[],
  refDate: Date = new Date()
): PasseportAlerte[] {
  const alertes: PasseportAlerte[] = [];
  const today = startOfDay(refDate);

  for (const d of dossiers) {
    const nom = joueurNom(d);

    if (d.date_expiration) {
      const level = getPasseportExpirationAlert(d.date_expiration, refDate);
      if (level) {
        const exp = parseDateOnly(d.date_expiration);
        const jours = daysBetween(today, exp);
        alertes.push({
          id: `pass-${d.id}`,
          type: "passeport",
          severite: level,
          joueur_id: d.joueur_id,
          joueur_nom: nom,
          date_echeance: d.date_expiration.slice(0, 10),
          jours_restants: jours,
          message:
            level === "expire"
              ? `Passeport expiré depuis le ${d.date_expiration.slice(0, 10)}`
              : `Passeport expire dans ${jours} jour(s) (${d.date_expiration.slice(0, 10)}) — renouveler (< 6 mois)`,
        });
      }
    }

    for (const v of d.visas ?? []) {
      if (!v.date_fin) continue;
      const level = getVisaExpirationAlert(v.date_fin, refDate);
      if (!level) continue;
      const exp = parseDateOnly(v.date_fin);
      const jours = daysBetween(today, exp);
      alertes.push({
        id: `visa-${d.id}-${v.id}`,
        type: "visa",
        severite: level,
        joueur_id: d.joueur_id,
        joueur_nom: nom,
        date_echeance: v.date_fin.slice(0, 10),
        jours_restants: jours,
        pays: v.pays,
        visa_id: v.id,
        message:
          level === "expire"
            ? `Visa ${v.pays} expiré (${v.date_fin.slice(0, 10)})`
            : `Visa ${v.pays} expire dans ${jours} jour(s) (${v.date_fin.slice(0, 10)}) — < 2 mois`,
      });
    }
  }

  return alertes.sort((a, b) => {
    const sev = (s: PasseportAlerteSeverite) => (s === "expire" ? 0 : 1);
    if (sev(a.severite) !== sev(b.severite)) return sev(a.severite) - sev(b.severite);
    return a.jours_restants - b.jours_restants;
  });
}

export function alertesPourJoueur(
  alertes: PasseportAlerte[],
  joueurId: string
): PasseportAlerte[] {
  return alertes.filter((a) => a.joueur_id === joueurId);
}

export function joueurAAlerte(alertes: PasseportAlerte[], joueurId: string): boolean {
  return alertes.some((a) => a.joueur_id === joueurId);
}
