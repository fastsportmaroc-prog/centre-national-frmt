"use client";

import type { HeatmapCell } from "@/lib/statistiques/types";

export function StatsHeatmap({ cells }: { cells: HeatmapCell[] }) {
  const max = Math.max(...cells.map((c) => c.value), 1);
  const weeks = Array.from({ length: 52 }, (_, i) => i);
  const days = [0, 1, 2, 3, 4, 5, 6];

  function intensity(week: number, day: number): number {
    const cell = cells.find((c) => c.week === week && c.day === day);
    return cell ? cell.value / max : 0;
  }

  return (
    <div className="overflow-x-auto">
      <svg viewBox="0 0 560 80" className="h-24 w-full min-w-[480px]">
        {weeks.map((w) =>
          days.map((d) => {
            const v = intensity(w, d);
            return (
              <rect
                key={`${w}-${d}`}
                x={w * 10 + 2}
                y={d * 10 + 2}
                width={8}
                height={8}
                rx={1}
                fill={`rgba(0, 98, 51, ${0.08 + v * 0.92})`}
              />
            );
          })
        )}
      </svg>
      <p className="mt-1 text-xs text-muted">Intensité = nombre de participants actifs par jour</p>
    </div>
  );
}
