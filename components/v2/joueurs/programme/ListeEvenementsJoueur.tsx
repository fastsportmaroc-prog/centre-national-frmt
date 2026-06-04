"use client";

import { BadgeTypeEvenement } from "@/components/v2/programmation-joueurs/BadgeTypeEvenement";
import {
  PROGRAMMATION_SURFACE_LABELS,
} from "@/lib/constants/programmation-joueurs";
import type { ProgrammationEvenementEnriched } from "@/lib/types/programmation-joueurs";
import { formatPeriodePdf } from "@/lib/pdf/pdf-format";

type Props = {
  evenements: ProgrammationEvenementEnriched[];
  onEventClick?: (ev: ProgrammationEvenementEnriched) => void;
};

export function ListeEvenementsJoueur({ evenements, onEventClick }: Props) {
  const sorted = [...evenements].sort((a, b) => b.date_debut.localeCompare(a.date_debut));

  if (!sorted.length) {
    return <p className="text-sm text-[var(--text-secondary)]">Aucun événement programmé.</p>;
  }

  return (
    <ul className="divide-y divide-[var(--border)]">
      {sorted.map((ev) => {
        const lieu = [ev.ville, ev.pays].filter(Boolean).join(", ");
        return (
          <li key={ev.id}>
            <button
              type="button"
              className="flex w-full flex-wrap items-start gap-3 py-3 text-left hover:bg-[var(--bg-elevated)]"
              onClick={() => onEventClick?.(ev)}
            >
              <div className="min-w-[120px] text-xs text-[var(--text-secondary)]">
                {formatPeriodePdf(ev.date_debut, ev.date_fin)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{ev.nom}</p>
                {lieu && <p className="text-xs text-[var(--text-secondary)]">{lieu}</p>}
                <div className="mt-1 flex flex-wrap gap-2 text-xs">
                  <BadgeTypeEvenement type={ev.type} compact />
                  {ev.surface && (
                    <span className="text-[var(--text-secondary)]">
                      {PROGRAMMATION_SURFACE_LABELS[ev.surface]}
                    </span>
                  )}
                  {ev.points_gagnes != null && (
                    <span className="text-[var(--text-secondary)]">{ev.points_gagnes} pts</span>
                  )}
                  {ev.resultat_simple && (
                    <span className="text-[var(--text-secondary)]">{ev.resultat_simple}</span>
                  )}
                </div>
              </div>
              <span className="text-xs capitalize text-[var(--text-secondary)]">
                {ev.statut.replace("_", " ")}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
