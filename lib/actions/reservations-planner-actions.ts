"use server";

import { loadReservationsPageAction } from "@/lib/actions/reservations-page-actions";

/** @deprecated Préférer loadReservationsPageAction — source unique stages → terrains. */
export async function loadReservationsPlannerAction(options?: {
  dateDebut?: string;
  dateFin?: string;
  syncBeforeLoad?: boolean;
}) {
  const { reservations } = await loadReservationsPageAction({
    dateDebut: options?.dateDebut,
    dateFin: options?.dateFin,
    syncBeforeLoad: options?.syncBeforeLoad,
  });
  return { reservations, planning: [] };
}
