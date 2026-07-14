"use client";

import {
  PLANNING_CNE_COLORS,
  PLANNING_CNE_STAGE_LEGEND,
} from "@/lib/programmation-joueurs/planning-cne-colors";

export function PlanningCNELegend() {
  const items = Object.values(PLANNING_CNE_COLORS);

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
        Légende
      </span>
      {items.map((item) => (
        <span
          key={item.label}
          className="inline-flex items-center gap-1.5 text-xs text-[var(--text-secondary)]"
        >
          <span
            className="inline-block h-3 w-5 rounded border"
            style={{
              backgroundColor: item.bg === "transparent" ? "var(--bg-elevated)" : item.bg,
              borderColor: item.border,
              color: item.text,
            }}
          />
          {item.label}
        </span>
      ))}
      {PLANNING_CNE_STAGE_LEGEND.map((item) => (
        <span
          key={item.label}
          className="inline-flex items-center gap-1.5 text-xs text-[var(--text-secondary)]"
        >
          <span
            className="inline-flex h-3 w-5 items-center justify-center rounded text-[6px] font-bold leading-none"
            style={{
              backgroundColor: item.bg,
              border: `1px ${item.borderStyle} ${item.border}`,
              color: item.text,
            }}
          >
            {"badge" in item && item.badge ? "…" : null}
          </span>
          {item.label}
        </span>
      ))}
    </div>
  );
}
