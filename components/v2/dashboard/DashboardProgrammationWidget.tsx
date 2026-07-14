"use client";

import Link from "next/link";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import type { ProgrammationEvenementEnriched } from "@/lib/types/programmation-joueurs";

type Props = {
  events: ProgrammationEvenementEnriched[];
};

const TYPE_LABEL: Record<string, string> = {
  tournoi_itf: "Tournoi ITF",
  tournoi_atp_wta: "Tournoi ATP/WTA",
  coupe_davis: "Coupe Davis",
  bjk_cup: "BJK Cup",
  stage_national: "Stage national",
  stage_etranger: "Stage étranger",
  competition_nationale: "Compétition nationale",
  blessure: "Blessure",
  repos: "Repos",
};

function fmt(iso: string): string {
  return format(parseISO(`${iso.slice(0, 10)}T00:00:00`), "dd/MM", { locale: fr });
}

export function DashboardProgrammationWidget({ events }: Props) {
  const sorted = [...events]
    .sort((a, b) => a.date_debut.localeCompare(b.date_debut))
    .slice(0, 12);

  return (
    <div className="v2-kpi-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="dashboard-section-label">Programmation joueurs &amp; coachs</h2>
        <Link
          href="/v2/programmation-joueurs"
          className="text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          Ouvrir Programmes →
        </Link>
      </div>

      {sorted.length === 0 ? (
        <p className="py-6 text-center text-[12px] text-[var(--text-muted)]">
          Aucun événement programmé sur la période.
        </p>
      ) : (
        <ul className="space-y-0.5">
          {sorted.map((e) => (
            <li key={e.id}>
              <Link
                href="/v2/programmation-joueurs"
                className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-[var(--bg-hover)]"
              >
                <span className="w-16 shrink-0 text-[11px] text-[var(--text-muted)]">
                  {fmt(e.date_debut)}
                  {e.date_fin.slice(0, 10) !== e.date_debut.slice(0, 10) && (
                    <>–{fmt(e.date_fin)}</>
                  )}
                </span>
                <span className="min-w-0 flex-1 truncate text-[12px] text-[var(--text-primary)]">
                  {e.joueur_prenom || e.joueur_nom ? (
                    <span className="font-medium">
                      {e.joueur_prenom} {e.joueur_nom}
                    </span>
                  ) : null}
                  <span className="text-[var(--text-secondary)]"> · {e.nom || "—"}</span>
                </span>
                <span className="shrink-0 rounded bg-[var(--bg-inset)] px-1.5 py-0.5 text-[10px] text-[var(--text-muted)]">
                  {TYPE_LABEL[e.type] ?? e.type}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
