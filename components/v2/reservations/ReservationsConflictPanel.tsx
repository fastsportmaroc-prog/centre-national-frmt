"use client";

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import {
  analyzePlannerConflicts,
  conflictKindLabel,
  type PlannerConflict,
} from "@/lib/v2/reservations-planning-conflicts";
import type { PlanningSlotEnriched } from "@/lib/v2/reservations-planner-types";
import type { ReservationEnrichedV2 } from "@/lib/types/v2";
import { cn } from "@/lib/utils/cn";
import { useMemo } from "react";

type Props = {
  reservations: ReservationEnrichedV2[];
  planning: PlanningSlotEnriched[];
  onSelectDate?: (date: string) => void;
};

function severityClass(kind: PlannerConflict["kind"]): string {
  if (kind === "terrain_overlap" || kind === "terrain_programme") {
    return "border-red-500/50 bg-red-500/5";
  }
  return "border-amber-500/40 bg-amber-500/5";
}

export function ReservationsConflictPanel({ reservations, planning, onSelectDate }: Props) {
  const { conflicts } = useMemo(
    () => analyzePlannerConflicts(reservations, planning),
    [reservations, planning]
  );

  const critical = conflicts.filter(
    (c) => c.kind === "terrain_overlap" || c.kind === "terrain_programme"
  );
  const warnings = conflicts.filter(
    (c) => c.kind === "planning_sans_reservation" || c.kind === "reservation_sans_programme"
  );

  if (conflicts.length === 0) return null;

  return (
    <Card className="border-red-500/30 p-4">
      <h2 className="text-sm font-bold text-red-400">
        {critical.length > 0
          ? `${critical.length} conflit(s) bloquant(s) · ${warnings.length} alerte(s) alignement`
          : `${warnings.length} alerte(s) terrain ↔ programme`}
      </h2>
      <p className="mt-1 text-xs text-muted">
        Croisement réservations infrastructure et séances planning (même court, horaires qui se chevauchent).
      </p>
      <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto">
        {conflicts.slice(0, 40).map((c) => (
          <li
            key={c.id}
            className={cn(
              "rounded-md border px-3 py-2 text-xs",
              severityClass(c.kind)
            )}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold">{conflictKindLabel(c.kind)}</span>
              {onSelectDate && (
                <button
                  type="button"
                  className="text-frmt-green hover:underline"
                  onClick={() => onSelectDate(c.date)}
                >
                  {c.date}
                </button>
              )}
            </div>
            <p className="mt-1 text-muted">
              {c.court_nom ?? "Court"} — {c.stage_labels.join(" vs ")}
            </p>
            <p className="mt-0.5">{c.message}</p>
          </li>
        ))}
      </ul>
      {conflicts.length > 40 && (
        <p className="mt-2 text-xs text-muted">… et {conflicts.length - 40} autre(s)</p>
      )}
      <div className="mt-3 flex flex-wrap gap-3 text-xs">
        <Link href="/v2/planning" className="text-frmt-green hover:underline">
          Ouvrir le planning
        </Link>
      </div>
    </Card>
  );
}
