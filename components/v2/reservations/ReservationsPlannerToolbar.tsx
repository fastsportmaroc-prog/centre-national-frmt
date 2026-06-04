"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { PlannerPeriodMode, PlannerViewMode } from "@/lib/v2/reservations-planner";
import { CRENEAU_OPTIONS, type CreneauType } from "@/lib/v2/reservations-utils";
import {
  STAGE_LIFECYCLE_OPTIONS,
  type StageLifecycleFilter,
} from "@/lib/v2/stage-lifecycle-filter";
import { cn } from "@/lib/utils/cn";

const PERIOD_OPTIONS: { value: PlannerPeriodMode; label: string }[] = [
  { value: "all", label: "Tout" },
  { value: "month", label: "Mois" },
  { value: "week", label: "Semaine" },
  { value: "year", label: "Année" },
];

const VIEW_OPTIONS: { value: PlannerViewMode; label: string }[] = [
  { value: "list", label: "Liste" },
  { value: "table", label: "Tableau par court" },
];

type Props = {
  periodMode: PlannerPeriodMode;
  viewMode: PlannerViewMode;
  pivotDate: string;
  rangeLabel: string;
  stageFilter: string;
  stageLifecycleFilter: StageLifecycleFilter;
  creneauFilter: CreneauType | "all";
  stages: { id: string; stage_action: string }[];
  onPeriodChange: (m: PlannerPeriodMode) => void;
  onViewChange: (v: PlannerViewMode) => void;
  onPivotChange: (iso: string) => void;
  onShiftPivot: (dir: -1 | 1) => void;
  onStageFilter: (id: string) => void;
  onStageLifecycleFilter: (f: StageLifecycleFilter) => void;
  onCreneauFilter: (c: CreneauType | "all") => void;
};

export function ReservationsPlannerToolbar({
  periodMode,
  viewMode,
  pivotDate,
  rangeLabel,
  stageFilter,
  stageLifecycleFilter,
  creneauFilter,
  stages,
  onPeriodChange,
  onViewChange,
  onPivotChange,
  onShiftPivot,
  onStageFilter,
  onStageLifecycleFilter,
  onCreneauFilter,
}: Props) {
  const monthValue = pivotDate.slice(0, 7);

  return (
    <Card className="space-y-3 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-muted">Période</span>
        {PERIOD_OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onPeriodChange(o.value)}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
              periodMode === o.value
                ? "bg-frmt-green/20 text-frmt-green"
                : "bg-surface-elevated text-muted hover:text-foreground"
            )}
          >
            {o.label}
          </button>
        ))}
      </div>

      {periodMode !== "all" && (
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => onShiftPivot(-1)} aria-label="Période précédente">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[10rem] text-center text-sm font-semibold capitalize">{rangeLabel}</span>
          <Button variant="secondary" size="sm" onClick={() => onShiftPivot(1)} aria-label="Période suivante">
            <ChevronRight className="h-4 w-4" />
          </Button>
          {periodMode === "month" && (
            <input
              type="month"
              className="rounded-md border border-border bg-surface px-2 py-1 text-sm"
              value={monthValue}
              onChange={(e) => {
                const v = e.target.value;
                if (v) onPivotChange(`${v}-01`);
              }}
            />
          )}
          {periodMode === "week" && (
            <input
              type="date"
              className="rounded-md border border-border bg-surface px-2 py-1 text-sm"
              value={pivotDate.slice(0, 10)}
              onChange={(e) => onPivotChange(e.target.value)}
            />
          )}
          {periodMode === "year" && (
            <input
              type="number"
              min={2020}
              max={2035}
              className="w-24 rounded-md border border-border bg-surface px-2 py-1 text-sm"
              value={pivotDate.slice(0, 4)}
              onChange={(e) => onPivotChange(`${e.target.value}-06-01`)}
            />
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
        <span className="text-xs font-medium uppercase tracking-wide text-muted">Affichage</span>
        {VIEW_OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onViewChange(o.value)}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
              viewMode === o.value
                ? "bg-frmt-green/20 text-frmt-green"
                : "bg-surface-elevated text-muted hover:text-foreground"
            )}
          >
            {o.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
        <span className="text-xs font-medium uppercase tracking-wide text-muted">Stage</span>
        {STAGE_LIFECYCLE_OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onStageLifecycleFilter(o.value)}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
              stageLifecycleFilter === o.value
                ? "bg-frmt-green/20 text-frmt-green"
                : "bg-surface-elevated text-muted hover:text-foreground"
            )}
          >
            {o.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 border-t border-border/60 pt-3">
        <select
          className="min-w-[12rem] rounded-md border border-border bg-surface px-2 py-1.5 text-sm"
          value={stageFilter}
          onChange={(e) => onStageFilter(e.target.value)}
        >
          <option value="all">Tous les stages (liste)</option>
          {stages.map((s) => (
            <option key={s.id} value={s.id}>
              {s.stage_action}
            </option>
          ))}
        </select>
        <select
          className="rounded-md border border-border bg-surface px-2 py-1.5 text-sm"
          value={creneauFilter}
          onChange={(e) => onCreneauFilter(e.target.value as CreneauType | "all")}
        >
          <option value="all">Tous créneaux</option>
          {CRENEAU_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    </Card>
  );
}
