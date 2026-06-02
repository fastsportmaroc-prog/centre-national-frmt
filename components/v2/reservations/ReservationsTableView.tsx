"use client";

import Link from "next/link";
import { format } from "date-fns";
import type { ReservationEnrichedV2 } from "@/lib/types/v2";
import {
  getCreneauInfoForReservation,
  infraLine,
  parseReservationDate,
} from "@/lib/v2/reservations-utils";
import { cn } from "@/lib/utils/cn";

type Props = {
  rows: ReservationEnrichedV2[];
  conflictIds: Set<string>;
};

export function ReservationsTableView({ rows, conflictIds }: Props) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="v2-data-table w-full text-sm">
        <thead>
          <tr>
            <th className="p-2 text-left">Date</th>
            <th className="p-2 text-left">Court</th>
            <th className="p-2 text-left">Créneau</th>
            <th className="p-2 text-left">Horaires</th>
            <th className="p-2 text-left">Stage</th>
            <th className="p-2 text-left">Statut</th>
            <th className="p-2 text-left">Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const c = getCreneauInfoForReservation(r);
            const conflict = conflictIds.has(r.id);
            const dateKey = format(parseReservationDate(r.date_debut), "yyyy-MM-dd");
            return (
              <tr
                key={r.id}
                className={cn(conflict && "bg-red-500/5")}
              >
                <td className="p-2 whitespace-nowrap">{dateKey}</td>
                <td className="p-2">{r.court_nom ?? "—"}</td>
                <td className="p-2">
                  {c.emoji} {c.label}
                  {conflict && (
                    <span className="ml-1 text-[10px] font-medium text-red-400">Conflit</span>
                  )}
                </td>
                <td className="p-2 whitespace-nowrap">
                  {c.heureDebut} → {c.heureFin}
                </td>
                <td className="p-2 max-w-[200px] truncate" title={r.stage_nom ?? ""}>
                  {r.stage_nom ?? "—"}
                </td>
                <td className="p-2">{r.statut}</td>
                <td className="p-2">
                  {r.stage_id ? (
                    <Link
                      href={`/v2/stages/${encodeURIComponent(r.stage_id)}?tab=terrains`}
                      className="text-frmt-green hover:underline"
                    >
                      Modifier
                    </Link>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
