import type { ConflictReservation } from "@/services/conflictDetector";
import type { ReservationEnrichedV2 } from "@/lib/types/v2";

function isCancelledStatut(statut: string | null | undefined): boolean {
  const s = (statut ?? "").toLowerCase();
  return s.includes("annul");
}

export function reservationToConflictRow(r: ReservationEnrichedV2): ConflictReservation {
  return {
    id: r.id,
    stage_id: r.stage_id ?? null,
    terrain_id: r.infrastructure_id,
    date: String(r.date_debut).slice(0, 10),
    creneau: r.creneau ?? "journee",
    heure_debut: r.heure_debut,
    heure_fin: r.heure_fin,
  };
}

export function infraRowToConflictRow(row: {
  id: string;
  stage_id?: string | null;
  infrastructure_id: string;
  date_debut: string;
  creneau?: string | null;
  heure_debut?: string | null;
  heure_fin?: string | null;
  statut?: string | null;
}): ConflictReservation | null {
  if (isCancelledStatut(row.statut)) return null;
  return {
    id: row.id,
    stage_id: row.stage_id ?? null,
    terrain_id: row.infrastructure_id,
    date: String(row.date_debut).slice(0, 10),
    creneau: row.creneau ?? "journee",
    heure_debut: row.heure_debut,
    heure_fin: row.heure_fin,
  };
}
