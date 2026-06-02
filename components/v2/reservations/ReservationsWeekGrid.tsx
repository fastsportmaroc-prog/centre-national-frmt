"use client";

import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { Card } from "@/components/ui/Card";
import type { PlanningSlotEnriched } from "@/lib/v2/reservations-planner-types";
import type { InfrastructureV2, ReservationEnrichedV2 } from "@/lib/types/v2";
import { getCreneauInfoForReservation, parseReservationDate } from "@/lib/v2/reservations-utils";
import { cn } from "@/lib/utils/cn";

type Props = {
  days: string[];
  infrastructures: InfrastructureV2[];
  reservations: ReservationEnrichedV2[];
  planning: PlanningSlotEnriched[];
  highlightReservationIds?: Set<string>;
};

export function ReservationsWeekGrid({
  days,
  infrastructures,
  reservations,
  planning,
  highlightReservationIds,
}: Props) {
  const courts = infrastructures.filter((i) =>
    reservations.some((r) => r.infrastructure_id === i.id) ||
    planning.some((p) => p.infrastructure_id === i.id)
  );
  const displayCourts = courts.length ? courts : infrastructures.slice(0, 8);

  return (
    <Card className="overflow-x-auto p-2">
      <table className="w-full min-w-[640px] border-collapse text-xs">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-surface p-2 text-left font-medium text-muted">
              Court
            </th>
            {days.map((d) => {
              if (!d) return <th key={`pad-h-${days.indexOf(d)}`} className="p-2" />;
              const date = parseISO(d);
              const weekend = [0, 6].includes(date.getDay());
              return (
                <th
                  key={d}
                  className={cn(
                    "border-b border-border p-2 text-center font-medium capitalize",
                    weekend && "text-frmt-green"
                  )}
                >
                  {format(date, "EEE d", { locale: fr })}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {displayCourts.map((court) => (
            <tr key={court.id} className="border-t border-border/60">
              <td className="sticky left-0 z-10 bg-surface p-2 font-medium">{court.nom}</td>
              {days.map((d) => {
                if (!d) return <td key={`${court.id}-pad`} className="p-1" />;
                const res = reservations.filter(
                  (r) =>
                    r.infrastructure_id === court.id &&
                    format(parseReservationDate(r.date_debut), "yyyy-MM-dd") === d
                );
                const plan = planning.filter(
                  (p) => p.infrastructure_id === court.id && String(p.date).slice(0, 10) === d
                );
                return (
                  <td key={`${court.id}-${d}`} className="align-top p-1">
                    <div className="flex min-h-[3rem] flex-col gap-0.5">
                      {res.map((r) => {
                        const c = getCreneauInfoForReservation(r);
                        const hot = highlightReservationIds?.has(r.id);
                        return (
                          <div
                            key={r.id}
                            title={r.stage_nom ?? ""}
                            className={cn(
                              "truncate rounded bg-emerald-500/15 px-1 py-0.5 text-[10px]",
                              hot && "ring-1 ring-red-500"
                            )}
                          >
                            R {c.heureDebut}–{c.heureFin}
                            <br />
                            <span className="text-muted">{r.stage_nom?.slice(0, 18) ?? "—"}</span>
                          </div>
                        );
                      })}
                      {plan.map((p) => (
                        <div
                          key={p.id}
                          title={p.stage_nom ?? ""}
                          className="truncate rounded border border-dashed border-sky-500/40 bg-sky-500/10 px-1 py-0.5 text-[10px]"
                        >
                          P {(p.heure_debut ?? "").slice(0, 5)}–{(p.heure_fin ?? "").slice(0, 5)}
                        </div>
                      ))}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 px-2 text-[10px] text-muted">
        <span className="inline-block rounded bg-emerald-500/15 px-1">R</span> réservation ·{" "}
        <span className="inline-block rounded border border-dashed border-sky-500/40 bg-sky-500/10 px-1">
          P
        </span>{" "}
        planning
      </p>
    </Card>
  );
}
