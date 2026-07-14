"use client";

import { Select } from "@/components/ui/Input";
import { FrenchDateInput } from "@/components/v2/programmation-joueurs/FrenchDateInput";
import {
  DASHBOARD_PERIOD_OPTIONS,
  formatDashboardPeriodFr,
  type DashboardPeriod,
  type DashboardPeriodPreset,
} from "@/lib/v2/dashboard-period";

type Props = {
  preset: DashboardPeriodPreset;
  period: DashboardPeriod;
  onPresetChange: (preset: DashboardPeriodPreset) => void;
  onCustomChange: (patch: Partial<DashboardPeriod>) => void;
};

export function DashboardPeriodBar({ preset, period, onPresetChange, onCustomChange }: Props) {
  return (
    <div className="flex flex-wrap items-end gap-3 rounded-xl border border-[var(--border-main)] bg-[var(--bg-card)] p-3">
      <div className="min-w-[160px]">
        <label className="mb-1.5 block text-sm font-medium text-[var(--text-muted)]">Période</label>
        <Select
          value={preset}
          onChange={(e) => onPresetChange(e.target.value as DashboardPeriodPreset)}
        >
          {DASHBOARD_PERIOD_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </div>

      <FrenchDateInput
        label="Du"
        value={period.start}
        max={period.end}
        onChange={(iso) => onCustomChange({ start: iso ?? undefined })}
      />
      <FrenchDateInput
        label="Au"
        value={period.end}
        min={period.start}
        onChange={(iso) => onCustomChange({ end: iso ?? undefined })}
      />

      <div className="ml-auto self-center rounded-lg border border-[var(--border-main)] bg-[var(--bg-inset)] px-3 py-2 text-sm">
        <span className="text-[var(--text-secondary)]">Affichage : </span>
        <span className="font-medium capitalize text-[var(--text-primary)]">
          {formatDashboardPeriodFr(period)}
        </span>
      </div>
    </div>
  );
}
