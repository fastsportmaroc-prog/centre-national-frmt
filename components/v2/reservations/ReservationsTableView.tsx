"use client";

import Link from "next/link";
import { useMemo } from "react";
import { format, isWeekend, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import type { ReservationEnrichedV2 } from "@/lib/types/v2";
import { buildReservationsCourtDateMatrix } from "@/lib/v2/reservations-court-matrix";
import {
  CRENEAU_OPTIONS,
  getCreneauInfoForReservation,
  parseReservationDate,
} from "@/lib/v2/reservations-utils";
import { cn } from "@/lib/utils/cn";

type Props = {
  rows: ReservationEnrichedV2[];
  conflictIds: Set<string>;
};

function DateColumnHeader({ dateKey }: { dateKey: string }) {
  const d = parseReservationDate(dateKey);
  const weekend = isWeekend(d);
  return (
    <th
      className={cn(
        "min-w-[7.5rem] border-b border-border px-2 py-2 text-center align-bottom",
        weekend ? "bg-frmt-green/10" : "bg-surface-elevated/80"
      )}
    >
      <div
        className={cn(
          "text-[10px] font-semibold uppercase tracking-wide",
          weekend ? "text-frmt-green" : "text-muted"
        )}
      >
        {format(d, "EEE", { locale: fr })}
      </div>
      <div className={cn("text-sm font-bold capitalize", weekend && "text-frmt-green")}>
        {format(d, "d MMM", { locale: fr })}
      </div>
    </th>
  );
}

function MatrixReservationChip({
  r,
  conflict,
}: {
  r: ReservationEnrichedV2;
  conflict: boolean;
}) {
  const c = getCreneauInfoForReservation(r);
  const href = r.stage_id
    ? `/v2/stages/${encodeURIComponent(r.stage_id)}?tab=terrains`
    : null;

  const inner = (
    <div
      className={cn(
        "rounded-md border px-2 py-1.5 text-left transition-colors",
        c.badgeClass,
        conflict && "ring-1 ring-red-500/60",
        href && "hover:brightness-110"
      )}
    >
      <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide opacity-90">
        <span aria-hidden>{c.emoji}</span>
        <span>{c.label}</span>
        {conflict && <span className="text-red-500">!</span>}
      </div>
      <p className="mt-0.5 truncate text-xs font-medium leading-tight" title={r.stage_nom ?? ""}>
        {r.stage_nom ?? "—"}
      </p>
      <p className="text-[10px] opacity-75">
        {c.heureDebut} → {c.heureFin}
      </p>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {inner}
      </Link>
    );
  }
  return inner;
}

export function ReservationsTableView({ rows, conflictIds }: Props) {
  const matrix = useMemo(() => buildReservationsCourtDateMatrix(rows), [rows]);

  if (matrix.dates.length === 0 || matrix.courts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted">
          <span className="font-medium text-foreground">Vue par court</span>
          {" — "}
          {matrix.courts.length} terrain{matrix.courts.length > 1 ? "s" : ""},{" "}
          {matrix.dates.length} jour{matrix.dates.length > 1 ? "s" : ""}
        </p>
        <div className="flex flex-wrap gap-2">
          {CRENEAU_OPTIONS.map((o) => (
            <span
              key={o.value}
              className="rounded-full border border-border bg-surface-elevated/60 px-2 py-0.5 text-[10px] text-muted"
            >
              {o.emoji} {o.label}
            </span>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border shadow-sm ring-1 ring-border/40">
        <table className="w-full min-w-max border-collapse text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 z-20 min-w-[9rem] border-b border-r border-border bg-surface px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                Court
              </th>
              {matrix.dates.map((dateKey) => (
                <DateColumnHeader key={dateKey} dateKey={dateKey} />
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.courts.map((court, rowIndex) => (
              <tr
                key={court.id}
                className={cn(
                  "border-t border-border/60",
                  rowIndex % 2 === 1 && "bg-surface-elevated/20"
                )}
              >
                <td className="sticky left-0 z-10 border-r border-border bg-surface px-3 py-2 align-top">
                  <p className="font-semibold leading-tight">{court.nom}</p>
                  {court.surface && (
                    <p className="mt-0.5 text-[10px] capitalize text-muted">{court.surface}</p>
                  )}
                </td>
                {matrix.dates.map((dateKey) => {
                  const cellRows = matrix.getCell(court.id, dateKey);
                  const weekend = isWeekend(parseISO(`${dateKey}T12:00:00`));
                  return (
                    <td
                      key={dateKey}
                      className={cn(
                        "min-w-[7.5rem] align-top px-1.5 py-1.5",
                        weekend && "bg-frmt-green/[0.04]"
                      )}
                    >
                      {cellRows.length === 0 ? (
                        <span className="flex h-full min-h-[2.5rem] items-center justify-center text-xs text-muted/30">
                          —
                        </span>
                      ) : (
                        <div className="flex flex-col gap-1">
                          {cellRows.map((r) => (
                            <MatrixReservationChip
                              key={r.id}
                              r={r}
                              conflict={conflictIds.has(r.id)}
                            />
                          ))}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
