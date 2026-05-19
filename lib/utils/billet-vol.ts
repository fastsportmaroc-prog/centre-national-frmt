/** Ajoute des jours à une date ISO (yyyy-mm-dd) */
export function addDaysToIsoDate(isoDate: string, days: number): string {
  const d = new Date(isoDate + "T12:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0]!;
}

/** Calcule la date retour à partir de l'aller et de la durée de séjour */
export function computeDateRetour(
  dateAller: string,
  dureeSejourJours: number
): string | null {
  if (!dateAller || dureeSejourJours < 1) return null;
  return addDaysToIsoDate(dateAller, dureeSejourJours);
}
