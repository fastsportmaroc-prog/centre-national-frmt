import type { DashboardStats } from "@/lib/types/database";
import { isToday } from "@/lib/utils/dates";
import { getCourts } from "./courts";
import { getJoueurs } from "./joueurs";
import { getReservations } from "./reservations";

export async function getDashboardStats(): Promise<DashboardStats> {
  const [joueurs, courts, reservations] = await Promise.all([
    getJoueurs(),
    getCourts(),
    getReservations(),
  ]);

  const courtsActifs = courts.filter((c) => c.actif).length;
  const reservationsAujourdhui = reservations.filter(
    (r) => r.statut !== "annulee" && isToday(r.date_debut)
  ).length;

  const slotsParJour = courtsActifs * 12;
  const tauxOccupation =
    slotsParJour > 0
      ? Math.min(100, Math.round((reservationsAujourdhui / slotsParJour) * 100))
      : 0;

  return {
    totalJoueurs: joueurs.length,
    courtsActifs,
    reservationsAujourdhui,
    tauxOccupation,
  };
}
