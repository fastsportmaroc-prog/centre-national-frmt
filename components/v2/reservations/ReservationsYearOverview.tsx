"use client";

import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { Card } from "@/components/ui/Card";
import type { ReservationEnrichedV2 } from "@/lib/types/v2";
import { monthKeyFromDate } from "@/lib/v2/reservations-planner";
import { parseReservationDate } from "@/lib/v2/reservations-utils";
import { cn } from "@/lib/utils/cn";

type Props = {
  year: number;
  reservations: ReservationEnrichedV2[];
  conflictMonths?: Set<string>;
  onMonthClick?: (monthKey: string) => void;
};

const MONTHS = Array.from({ length: 12 }, (_, i) => i);

export function ReservationsYearOverview({
  year,
  reservations,
  conflictMonths,
  onMonthClick,
}: Props) {
  const byMonth = new Map<string, number>();
  for (const r of reservations) {
    const key = monthKeyFromDate(format(parseReservationDate(r.date_debut), "yyyy-MM-dd"));
    byMonth.set(key, (byMonth.get(key) ?? 0) + 1);
  }
  const max = Math.max(1, ...MONTHS.map((m) => byMonth.get(`${year}-${String(m + 1).padStart(2, "0")}`) ?? 0));

  return (
    <Card className="p-4">
      <h2 className="mb-4 text-center text-lg font-bold">{year}</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {MONTHS.map((m) => {
          const key = `${year}-${String(m + 1).padStart(2, "0")}`;
          const count = byMonth.get(key) ?? 0;
          const height = count > 0 ? Math.max(12, Math.round((count / max) * 48)) : 4;
          const hasConflict = conflictMonths?.has(key);
          const label = format(parseISO(`${key}-15`), "MMM", { locale: fr });
          return (
            <button
              key={key}
              type="button"
              onClick={() => onMonthClick?.(key)}
              className={cn(
                "flex flex-col items-center rounded-lg border border-border/60 p-3 transition-colors hover:bg-surface-elevated",
                hasConflict && "border-red-500/40"
              )}
            >
              <span className="text-xs font-medium capitalize">{label}</span>
              <div
                className="mt-2 w-full rounded bg-frmt-green/30"
                style={{ height: `${height}px` }}
              />
              <span className="mt-2 text-sm font-bold text-frmt-green">{count}</span>
              <span className="text-[10px] text-muted">réservations</span>
            </button>
          );
        })}
      </div>
    </Card>
  );
}
