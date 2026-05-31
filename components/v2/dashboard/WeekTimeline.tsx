"use client";

import { getCategoryStyle } from "@/lib/v2/category-colors";
import { formatTimelineDayLabel, isTodayMorocco } from "@/lib/v2/format-display-date";
import type { WeekTimelineDay } from "@/lib/v2/dashboard-data";
import { cn } from "@/lib/utils/cn";

export function WeekTimeline({
  days,
  prochainStage,
}: {
  days: WeekTimelineDay[];
  prochainStage: { nom: string; jours: number } | null;
}) {
  return (
    <div className="v2-kpi-card p-4">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#484f58]">Cette semaine</h3>
      <div className="space-y-2">
        {days.map((d) => {
          const isTodayRow = isTodayMorocco(d.date);
          return (
          <div key={d.date} className="flex gap-3 text-sm">
            <span
              className={cn(
                "w-36 shrink-0 text-xs font-medium sm:w-40",
                isTodayRow ? "text-frmt-green" : "text-[#8b949e]"
              )}
            >
              {formatTimelineDayLabel(d.date)}
            </span>
            <div className="min-w-0 flex-1">
              {d.stages.length === 0 ? (
                <span className="text-[#484f58]">—</span>
              ) : (
                d.stages.map((s) => {
                  const cat = getCategoryStyle(s.categorie);
                  return (
                    <span
                      key={s.id}
                      className="mr-2 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-[#e6edf3]"
                      style={{ backgroundColor: `${cat.border}22`, borderLeft: `3px solid ${cat.border}` }}
                    >
                      {s.enCours ? "■" : "□"} {s.nom.length > 28 ? `${s.nom.slice(0, 28)}…` : s.nom}
                    </span>
                  );
                })
              )}
            </div>
          </div>
        );
        })}
      </div>
      {prochainStage && (
        <p className="mt-4 border-t border-[#30363d] pt-3 text-xs text-[#8b949e]">
          Prochain stage : <span className="text-[#e6edf3]">{prochainStage.nom}</span>
          {prochainStage.jours >= 0
            ? ` — dans ${prochainStage.jours} jour${prochainStage.jours > 1 ? "s" : ""}`
            : ""}
        </p>
      )}
    </div>
  );
}
