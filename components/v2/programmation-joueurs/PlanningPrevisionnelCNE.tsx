"use client";

import { useMemo } from "react";
import { PLANNING_CNE_HEADER } from "@/lib/programmation-joueurs/planning-cne-colors";
import {
  buildPlanningCneGrid,
  type PlanningCneColumn,
} from "@/lib/programmation-joueurs/planning-cne-grid";
import type { ProgrammationEvenementEnriched } from "@/lib/types/programmation-joueurs";
import { cn } from "@/lib/utils/cn";

const COL_WIDTH = 140;
const DATE_COL_WIDTH = 90;
const JOUR_COL_WIDTH = 100;
const MOIS_COL_WIDTH = 90;

type Props = {
  columns: PlanningCneColumn[];
  evenements: ProgrammationEvenementEnriched[];
  rangeStart: string;
  rangeEnd: string;
  visibleColumnIds: Set<string>;
  onEventClick?: (ev: ProgrammationEvenementEnriched) => void;
};

export function PlanningPrevisionnelCNE({
  columns,
  evenements,
  rangeStart,
  rangeEnd,
  visibleColumnIds,
  onEventClick,
}: Props) {
  const activeColumns = useMemo(
    () => columns.filter((c) => visibleColumnIds.has(c.id)),
    [columns, visibleColumnIds]
  );

  const rows = useMemo(
    () =>
      buildPlanningCneGrid({
        rangeStart,
        rangeEnd,
        columns,
        evenements,
        visibleColumnIds,
      }),
    [rangeStart, rangeEnd, columns, evenements, visibleColumnIds]
  );

  if (activeColumns.length === 0) {
    return (
      <p className="p-6 text-sm text-[var(--text-secondary)]">
        Sélectionnez au moins un joueur ou coach pour afficher le planning.
      </p>
    );
  }

  const stickyLeft = (offset: number) => ({
    position: "sticky" as const,
    left: offset,
    zIndex: 20,
  });

  return (
    <div className="overflow-auto max-h-[calc(100vh-280px)]">
      <table className="w-max min-w-full border-collapse text-xs">
        <thead className="sticky top-0 z-30">
          <tr>
            <th
              colSpan={3 + activeColumns.length}
              className="border border-black bg-black px-4 py-2 text-center text-sm font-bold uppercase tracking-wide text-white"
            >
              Planning prévisionnel CNE FRMT — Joueurs &amp; Coaches
            </th>
          </tr>
          <tr>
            <th
              className="border border-black px-2 py-2 text-center font-bold uppercase"
              style={{
                ...stickyLeft(0),
                width: DATE_COL_WIDTH,
                minWidth: DATE_COL_WIDTH,
                backgroundColor: PLANNING_CNE_HEADER.date.bg,
                color: PLANNING_CNE_HEADER.date.text,
              }}
            >
              Date
            </th>
            <th
              className="border border-black px-2 py-2 text-center font-bold uppercase"
              style={{
                ...stickyLeft(DATE_COL_WIDTH),
                width: JOUR_COL_WIDTH,
                minWidth: JOUR_COL_WIDTH,
                backgroundColor: PLANNING_CNE_HEADER.date.bg,
                color: PLANNING_CNE_HEADER.date.text,
              }}
            >
              Jour
            </th>
            <th
              className="border border-black px-2 py-2 text-center font-bold uppercase"
              style={{
                ...stickyLeft(DATE_COL_WIDTH + JOUR_COL_WIDTH),
                width: MOIS_COL_WIDTH,
                minWidth: MOIS_COL_WIDTH,
                backgroundColor: PLANNING_CNE_HEADER.date.bg,
                color: PLANNING_CNE_HEADER.date.text,
              }}
            >
              Mois
            </th>
            {activeColumns.map((col) => {
              const header =
                col.kind === "coach" ? PLANNING_CNE_HEADER.coach : PLANNING_CNE_HEADER.joueur;
              return (
                <th
                  key={col.id}
                  className="border border-black px-1 py-2 text-center font-semibold uppercase leading-tight"
                  style={{
                    width: COL_WIDTH,
                    minWidth: COL_WIDTH,
                    maxWidth: COL_WIDTH,
                    backgroundColor: header.bg,
                    color: header.text,
                  }}
                  title={col.label}
                >
                  <div className="truncate">{col.prenom}</div>
                  <div className="truncate font-bold">{col.nom}</div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.dateKey} className="hover:bg-white/5">
              <td
                className="border border-[var(--border)] bg-[var(--bg-elevated)] px-2 py-1.5 text-center font-medium"
                style={{
                  ...stickyLeft(0),
                  width: DATE_COL_WIDTH,
                  minWidth: DATE_COL_WIDTH,
                }}
              >
                {row.dateLabel}
              </td>
              <td
                className="border border-[var(--border)] bg-[var(--bg-elevated)] px-2 py-1.5 text-center capitalize"
                style={{
                  ...stickyLeft(DATE_COL_WIDTH),
                  width: JOUR_COL_WIDTH,
                  minWidth: JOUR_COL_WIDTH,
                }}
              >
                {row.jourLabel}
              </td>
              <td
                className="border border-[var(--border)] bg-[var(--bg-elevated)] px-2 py-1.5 text-center capitalize"
                style={{
                  ...stickyLeft(DATE_COL_WIDTH + JOUR_COL_WIDTH),
                  width: MOIS_COL_WIDTH,
                  minWidth: MOIS_COL_WIDTH,
                }}
              >
                {row.moisLabel}
              </td>
              {activeColumns.map((col) => {
                const events = row.cells[col.id] ?? [];
                return (
                  <td
                    key={col.id}
                    className="border border-[var(--border)] p-0 align-top"
                    style={{ width: COL_WIDTH, minWidth: COL_WIDTH, maxWidth: COL_WIDTH }}
                  >
                    <div className="flex min-h-[36px] flex-col">
                      {events.map((cell, idx) => {
                        const { style } = cell;
                        const hasBorder = style.borderStyle !== "none";
                        return (
                          <button
                            key={cell.id}
                            type="button"
                            onClick={() => onEventClick?.(cell.evenement)}
                            className={cn(
                              "w-full px-1 py-0.5 text-left text-[10px] font-medium leading-tight",
                              onEventClick && "cursor-pointer hover:opacity-90",
                              style.italic && "italic",
                              idx > 0 && "border-t border-white/30"
                            )}
                            style={{
                              backgroundColor: style.bg,
                              color: style.text,
                              border: hasBorder
                                ? `1px ${style.borderStyle} ${style.borderColor}`
                                : undefined,
                            }}
                            title={cell.fullLabel}
                          >
                            <span className="line-clamp-2">{cell.label}</span>
                            {style.subtitle ? (
                              <span className="mt-0.5 block text-[8px] font-normal opacity-90">
                                {style.subtitle}
                              </span>
                            ) : null}
                            {style.badge ? (
                              <span className="mt-0.5 inline-block rounded bg-white/20 px-1 text-[7px] font-bold uppercase tracking-wide">
                                {style.badge}
                              </span>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
