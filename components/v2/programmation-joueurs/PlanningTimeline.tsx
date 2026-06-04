"use client";

import {
  addDays,
  eachDayOfInterval,
  eachMonthOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { fr } from "date-fns/locale";
import { PROGRAMMATION_TYPE_COLORS } from "@/lib/constants/programmation-joueurs";
import type { ProgrammationEvenementEnriched } from "@/lib/types/programmation-joueurs";
import type { JoueurV2 } from "@/lib/types/v2";
import { cn } from "@/lib/utils/cn";
import { TooltipEvenement } from "./TooltipEvenement";

export type PlanningViewMode = "mensuelle" | "hebdomadaire" | "annuelle" | "plage";

type Props = {
  joueurs: JoueurV2[];
  evenements: ProgrammationEvenementEnriched[];
  viewMode: PlanningViewMode;
  rangeStart: string;
  rangeEnd: string;
  selectedJoueurIds: Set<string>;
  onToggleJoueur: (id: string) => void;
  onEventClick: (ev: ProgrammationEvenementEnriched) => void;
};

function eventOverlaps(ev: ProgrammationEvenementEnriched, start: Date, end: Date): boolean {
  const d0 = parseISO(ev.date_debut.slice(0, 10));
  const d1 = parseISO(ev.date_fin.slice(0, 10));
  return d0 <= end && d1 >= start;
}

function columnLabels(
  viewMode: PlanningViewMode,
  rangeStart: string,
  rangeEnd: string
): { key: string; label: string; start: Date; end: Date }[] {
  const start = parseISO(rangeStart.slice(0, 10));
  const end = parseISO(rangeEnd.slice(0, 10));

  if (viewMode === "annuelle") {
    return eachMonthOfInterval({ start, end }).map((m) => ({
      key: format(m, "yyyy-MM"),
      label: format(m, "MMM", { locale: fr }),
      start: startOfMonth(m),
      end: endOfMonth(m),
    }));
  }
  if (viewMode === "hebdomadaire") {
    const cols: { key: string; label: string; start: Date; end: Date }[] = [];
    let w = startOfWeek(start, { weekStartsOn: 1 });
    while (w <= end) {
      const we = endOfWeek(w, { weekStartsOn: 1 });
      cols.push({
        key: format(w, "yyyy-MM-dd"),
        label: `S${format(w, "w")}`,
        start: w,
        end: we < end ? we : end,
      });
      w = addDays(we, 1);
    }
    return cols;
  }
  return eachDayOfInterval({ start, end }).map((d) => ({
    key: format(d, "yyyy-MM-dd"),
    label: format(d, "d", { locale: fr }),
    start: d,
    end: d,
  }));
}

export function PlanningTimeline({
  joueurs,
  evenements,
  viewMode,
  rangeStart,
  rangeEnd,
  selectedJoueurIds,
  onToggleJoueur,
  onEventClick,
}: Props) {
  const cols = columnLabels(viewMode, rangeStart, rangeEnd);
  const colWidth = viewMode === "annuelle" ? 48 : viewMode === "hebdomadaire" ? 56 : 28;

  const activeJoueurs = joueurs.filter(
    (j) => (j.statut ?? "actif") === "actif" || evenements.some((e) => e.joueur_id === j.id)
  );

  return (
    <div className="overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--bg-card)]">
      <div className="min-w-max">
        <div className="sticky top-0 z-10 flex border-b border-[var(--border)] bg-[var(--bg-elevated)]">
          <div className="sticky left-0 z-20 w-48 shrink-0 border-r border-[var(--border)] bg-[var(--bg-elevated)] px-2 py-2 text-xs font-medium text-[var(--text-secondary)]">
            Joueur
          </div>
          {cols.map((c) => (
            <div
              key={c.key}
              className="shrink-0 border-r border-[var(--border)] px-1 py-2 text-center text-[10px] text-[var(--text-secondary)]"
              style={{ width: colWidth }}
            >
              {c.label}
            </div>
          ))}
        </div>

        {activeJoueurs.map((j) => {
          const jEvents = evenements.filter((e) => e.joueur_id === j.id);
          return (
            <div key={j.id} className="flex border-b border-[var(--border)] last:border-b-0">
              <div className="sticky left-0 z-10 flex w-48 shrink-0 items-center gap-2 border-r border-[var(--border)] bg-[var(--bg-card)] px-2 py-2">
                <input
                  type="checkbox"
                  checked={selectedJoueurIds.has(j.id)}
                  onChange={() => onToggleJoueur(j.id)}
                  className="shrink-0"
                  aria-label={`Sélectionner ${j.prenom} ${j.nom}`}
                />
                <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--frmt-navy)] text-[10px] font-bold text-white">
                  {j.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={j.photo_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    `${j.prenom?.[0] ?? ""}${j.nom?.[0] ?? ""}`
                  )}
                </span>
                <span className="truncate text-xs font-medium">
                  {j.prenom} {j.nom}
                </span>
              </div>
              <div className="relative flex">
                {cols.map((col) => {
                  const cellEvents = jEvents.filter((e) => eventOverlaps(e, col.start, col.end));
                  return (
                    <div
                      key={col.key}
                      className="relative shrink-0 border-r border-[var(--border)] p-0.5"
                      style={{ width: colWidth, minHeight: 44 }}
                    >
                      {cellEvents.map((ev) => {
                        const colors = PROGRAMMATION_TYPE_COLORS[ev.type];
                        return (
                          <TooltipEvenement key={ev.id} evenement={ev}>
                            <button
                              type="button"
                              onClick={() => onEventClick(ev)}
                              className={cn(
                                "mb-0.5 w-full truncate rounded border px-0.5 text-left text-[9px] leading-tight",
                                "hover:brightness-110"
                              )}
                              style={{
                                backgroundColor: colors.bg,
                                borderColor: colors.border,
                                color: colors.text,
                              }}
                            >
                              {ev.nom}
                            </button>
                          </TooltipEvenement>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {activeJoueurs.length === 0 && (
          <p className="p-4 text-sm text-[var(--text-secondary)]">Aucun joueur actif.</p>
        )}
      </div>
    </div>
  );
}
