"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { format, isWeekend, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { useToast } from "@/components/v2/ui/ToastProvider";
import { exportReservationsCourtMatrixPDF } from "@/lib/pdf/pdf-exports";
import type { ReservationEnrichedV2 } from "@/lib/types/v2";
import { buildReservationsCourtDateMatrix } from "@/lib/v2/reservations-court-matrix";
import {
  buildTableFilterOptions,
  splitReservationsForTable,
  type TableGroupBy,
} from "@/lib/v2/reservations-table-filters";
import {
  CRENEAU_OPTIONS,
  getCreneauInfoForReservation,
  parseReservationDate,
} from "@/lib/v2/reservations-utils";
import { getCategoryStyle } from "@/lib/v2/category-colors";
import { ReservationsTableFilterBar } from "@/components/v2/reservations/ReservationsTableFilterBar";
import { cn } from "@/lib/utils/cn";

type Props = {
  rows: ReservationEnrichedV2[];
  conflictIds: Set<string>;
  subtitle?: string;
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
  hideStageName,
}: {
  r: ReservationEnrichedV2;
  conflict: boolean;
  hideStageName?: boolean;
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
      {!hideStageName && (
        <p className="mt-0.5 truncate text-xs font-medium leading-tight" title={r.stage_nom ?? ""}>
          {r.stage_nom ?? "—"}
        </p>
      )}
      <p className={cn("text-[10px] opacity-75", hideStageName && "mt-0.5")}>
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

function CourtDateMatrixTable({
  rows,
  conflictIds,
  hideStageName,
}: {
  rows: ReservationEnrichedV2[];
  conflictIds: Set<string>;
  hideStageName?: boolean;
}) {
  const matrix = useMemo(() => buildReservationsCourtDateMatrix(rows), [rows]);

  if (matrix.dates.length === 0 || matrix.courts.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted">
        Aucune réservation dans cette section.
      </p>
    );
  }

  return (
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
                            hideStageName={hideStageName}
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
  );
}

function SectionHeading({ label, groupBy }: { label: string; groupBy: TableGroupBy }) {
  if (groupBy === "categorie") {
    const style = getCategoryStyle(label);
    return (
      <div
        className="mb-2 inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold"
        style={{
          backgroundColor: style.bg,
          borderColor: style.border,
          color: style.text,
        }}
      >
        {label}
      </div>
    );
  }

  return (
    <h3 className="mb-2 border-b border-border pb-1 text-sm font-bold text-foreground">{label}</h3>
  );
}

export function ReservationsTableView({ rows, conflictIds, subtitle }: Props) {
  const { toast } = useToast();
  const [groupBy, setGroupBy] = useState<TableGroupBy>("all");
  const [valueFilter, setValueFilter] = useState("all");
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    setValueFilter("all");
  }, [groupBy]);

  const filterOptions = useMemo(() => buildTableFilterOptions(rows, groupBy), [rows, groupBy]);

  const sections = useMemo(
    () => splitReservationsForTable(rows, groupBy, valueFilter),
    [rows, groupBy, valueFilter]
  );

  const totalInView = sections.reduce((n, s) => n + s.rows.length, 0);
  const hideStageName = groupBy === "stage";

  async function handleExportPdf() {
    if (totalInView === 0) {
      toast("Aucune réservation à exporter", "error");
      return;
    }
    setExporting(true);
    try {
      await exportReservationsCourtMatrixPDF(sections, { subtitle, groupBy });
      toast("PDF tableau généré", "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Erreur export PDF", "error");
    } finally {
      setExporting(false);
    }
  }

  if (rows.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted">
          <span className="font-medium text-foreground">Vue par court</span>
          {" — "}
          {totalInView} réservation{totalInView > 1 ? "s" : ""}
          {sections.length > 1 ? ` · ${sections.length} sections` : ""}
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

      <ReservationsTableFilterBar
        groupBy={groupBy}
        valueFilter={valueFilter}
        options={filterOptions}
        exporting={exporting}
        onGroupByChange={setGroupBy}
        onValueFilterChange={setValueFilter}
        onExportPdf={() => void handleExportPdf()}
      />

      <div className="space-y-8">
        {sections.map((section) => (
          <section key={section.key} className="space-y-2">
            {groupBy !== "all" && <SectionHeading label={section.label} groupBy={groupBy} />}
            <CourtDateMatrixTable
              rows={section.rows}
              conflictIds={conflictIds}
              hideStageName={hideStageName}
            />
          </section>
        ))}
      </div>

      <ReservationsTableFilterBar
        groupBy={groupBy}
        valueFilter={valueFilter}
        options={filterOptions}
        exporting={exporting}
        onGroupByChange={setGroupBy}
        onValueFilterChange={setValueFilter}
        onExportPdf={() => void handleExportPdf()}
      />
    </div>
  );
}
