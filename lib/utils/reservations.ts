import type { Reservation } from "@/lib/types/database";

export function hasReservationOverlap(
  reservations: Reservation[],
  courtId: string,
  dateDebut: Date,
  dateFin: Date,
  excludeId?: string
): boolean {
  return reservations.some((r) => {
    if (r.statut === "annulee") return false;
    if (r.court_id !== courtId) return false;
    if (excludeId && r.id === excludeId) return false;
    const a0 = dateDebut.getTime();
    const a1 = dateFin.getTime();
    const b0 = new Date(r.date_debut).getTime();
    const b1 = new Date(r.date_fin).getTime();
    return a0 < b1 && a1 > b0;
  });
}
