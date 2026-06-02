"use client";

import { FileDown } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  TABLE_GROUP_LABELS,
  type TableFilterOption,
  type TableGroupBy,
} from "@/lib/v2/reservations-table-filters";
import { cn } from "@/lib/utils/cn";

const GROUP_MODES: TableGroupBy[] = ["all", "categorie", "stage", "coach"];

type Props = {
  groupBy: TableGroupBy;
  valueFilter: string;
  options: TableFilterOption[];
  exporting?: boolean;
  onGroupByChange: (mode: TableGroupBy) => void;
  onValueFilterChange: (value: string) => void;
  onExportPdf: () => void;
};

export function ReservationsTableFilterBar({
  groupBy,
  valueFilter,
  options,
  exporting,
  onGroupByChange,
  onValueFilterChange,
  onExportPdf,
}: Props) {
  return (
    <Card className="flex flex-wrap items-center justify-between gap-3 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-muted">Regrouper</span>
        {GROUP_MODES.map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => onGroupByChange(mode)}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
              groupBy === mode
                ? "bg-frmt-green/20 text-frmt-green"
                : "bg-surface-elevated text-muted hover:text-foreground"
            )}
          >
            {TABLE_GROUP_LABELS[mode]}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {groupBy !== "all" && (
          <select
            className="max-w-[16rem] rounded-md border border-border bg-surface px-2 py-1.5 text-sm"
            value={valueFilter}
            onChange={(e) => onValueFilterChange(e.target.value)}
            aria-label={`Filtrer par ${TABLE_GROUP_LABELS[groupBy]}`}
          >
            <option value="all">Tous — {TABLE_GROUP_LABELS[groupBy].toLowerCase()}</option>
            {options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        )}

        <Button variant="secondary" size="sm" disabled={exporting} onClick={onExportPdf}>
          <FileDown className="mr-1 h-3.5 w-3.5" />
          {exporting ? "PDF…" : "Exporter PDF"}
        </Button>
      </div>
    </Card>
  );
}
