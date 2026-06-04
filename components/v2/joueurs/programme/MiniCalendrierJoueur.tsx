"use client";

import {
  endOfMonth,
  format,
  startOfMonth,
} from "date-fns";
import { PROGRAMMATION_TYPE_COLORS } from "@/lib/constants/programmation-joueurs";
import type { ProgrammationEvenementEnriched } from "@/lib/types/programmation-joueurs";
import { TooltipEvenement } from "@/components/v2/programmation-joueurs/TooltipEvenement";

type Props = {
  evenements: ProgrammationEvenementEnriched[];
};

export function MiniCalendrierJoueur({ evenements }: Props) {
  const now = new Date();
  const start = startOfMonth(now);
  const end = endOfMonth(now);
  const days: Date[] = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    days.push(new Date(d));
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
      <p className="border-b border-[var(--border)] px-3 py-2 text-xs font-medium text-[var(--text-secondary)]">
        {format(now, "MMMM yyyy")}
      </p>
      <div className="grid grid-cols-7 gap-px bg-[var(--border)]">
        {days.map((d) => {
          const iso = format(d, "yyyy-MM-dd");
          const evs = evenements.filter((e) => e.date_debut <= iso && e.date_fin >= iso);
          return (
            <div key={iso} className="min-h-[52px] bg-[var(--bg-card)] p-1">
              <span className="text-[10px] text-[var(--text-secondary)]">{format(d, "d")}</span>
              <div className="mt-0.5 space-y-0.5">
                {evs.slice(0, 2).map((ev) => {
                  const c = PROGRAMMATION_TYPE_COLORS[ev.type];
                  return (
                    <TooltipEvenement key={ev.id} evenement={ev}>
                      <div
                        className="truncate rounded px-0.5 text-[8px]"
                        style={{ backgroundColor: c.bg, color: c.text }}
                      >
                        {ev.nom}
                      </div>
                    </TooltipEvenement>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
