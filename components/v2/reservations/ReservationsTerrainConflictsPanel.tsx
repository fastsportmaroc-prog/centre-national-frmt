"use client";

import { useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { reservationToConflictRow } from "@/lib/terrain/conflict-adapters";
import { detectConflicts } from "@/services/conflictDetector";
import type { ReservationEnrichedV2 } from "@/lib/types/v2";
type Props = {
  items: ReservationEnrichedV2[];
};

export function ReservationsTerrainConflictsPanel({ items }: Props) {
  const conflicts = useMemo(
    () => detectConflicts(items.map(reservationToConflictRow)),
    [items]
  );

  if (conflicts.length === 0) return null;

  const byId = new Map(items.map((r) => [r.id, r]));

  return (
    <Card className="border-red-500/30 p-4">
      <h2 className="text-sm font-bold text-red-400">
        {conflicts.length} double réservation(s) terrain détectée(s)
      </h2>
      <p className="mt-1 text-xs text-muted">
        Même court, même jour, horaires qui se chevauchent, stages différents. Corrigez sur l&apos;onglet{" "}
        <strong>Terrains</strong> du stage concerné.
      </p>
      <ul className="mt-3 max-h-48 space-y-2 overflow-y-auto text-xs">
        {conflicts.slice(0, 20).map((c) => {
          const a = byId.get(c.reservationId);
          const b = byId.get(c.conflictingReservationId);
          const court = a?.court_nom ?? b?.court_nom ?? "Court";
          return (
            <li
              key={`${c.reservationId}-${c.conflictingReservationId}`}
              className="rounded border border-red-500/30 bg-red-500/5 px-3 py-2"
            >
              <span className="font-medium">{c.date}</span> — {court} :{" "}
              {a?.stage_nom ?? "Stage A"} vs {b?.stage_nom ?? "Stage B"}
            </li>
          );
        })}
      </ul>
      {conflicts.length > 20 && (
        <p className="mt-2 text-xs text-muted">… et {conflicts.length - 20} autre(s)</p>
      )}
    </Card>
  );
}
