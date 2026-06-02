"use client";

import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { Card } from "@/components/ui/Card";
import type { ReservationEnrichedV2 } from "@/lib/types/v2";
import { parseReservationDate } from "@/lib/v2/reservations-utils";
import { weeksInRange, type PlannerRange } from "@/lib/v2/reservations-planner";
import { cn } from "@/lib/utils/cn";

type Props = {
  range: PlannerRange;
  reservations: ReservationEnrichedV2[];
  conflictDates?: Set<string>;
  onDayClick?: (date: string) => void;
};

export function ReservationsMonthCalendar({
  range,
  reservations,
  conflictDates,
  onDayClick,
}: Props) {
  const weeks = weeksInRange(range);
  const countByDay = new Map<string, number>();
  for (const r of reservations) {
    const key = format(parseReservationDate(r.date_debut), "yyyy-MM-dd");
    countByDay.set(key, (countByDay.get(key) ?? 0) + 1);
  }

  const weekdays = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

  return (
    <Card className="p-3">
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium text-muted">
        {weekdays.map((w) => (
          <div key={w}>{w}</div>
        ))}
      </div>
      {weeks.map((week, wi) => (
        <div key={wi} className="mt-1 grid grid-cols-7 gap-1">
          {week.map((d, di) => {
            if (!d) {
              return <div key={`${wi}-${di}-empty`} className="min-h-[4rem] rounded bg-transparent" />;
            }
            const count = countByDay.get(d) ?? 0;
            const hasConflict = conflictDates?.has(d);
            const date = parseISO(d);
            const weekend = [0, 6].includes(date.getDay());
            return (
              <button
                key={d}
                type="button"
                onClick={() => onDayClick?.(d)}
                className={cn(
                  "min-h-[4rem] rounded-md border border-border/60 p-1 text-left transition-colors hover:bg-surface-elevated",
                  weekend && "border-frmt-green/20",
                  hasConflict && "border-red-500/50 bg-red-500/5",
                  count > 0 && "bg-emerald-500/5"
                )}
              >
                <span
                  className={cn(
                    "text-xs font-semibold",
                    weekend && "text-frmt-green"
                  )}
                >
                  {format(date, "d")}
                </span>
                {count > 0 && (
                  <span className="mt-1 block text-[10px] text-muted">
                    {count} rés.
                  </span>
                )}
                {hasConflict && (
                  <span className="mt-0.5 block text-[9px] text-red-400">⚠ conflit</span>
                )}
              </button>
            );
          })}
        </div>
      ))}
      <p className="mt-2 text-xs text-muted capitalize">
        {format(parseISO(range.dateDebut), "MMMM yyyy", { locale: fr })}
      </p>
    </Card>
  );
}
