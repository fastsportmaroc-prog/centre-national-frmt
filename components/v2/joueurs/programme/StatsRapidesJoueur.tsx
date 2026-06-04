"use client";

import type { ProgrammationJoueurStats } from "@/lib/types/programmation-joueurs";

type Props = {
  stats: ProgrammationJoueurStats | null;
  loading?: boolean;
};

export function StatsRapidesJoueur({ stats, loading }: Props) {
  if (loading) {
    return <p className="text-sm text-[var(--text-secondary)]">Chargement stats…</p>;
  }
  if (!stats) return null;

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-lg border border-[var(--border)] p-3">
        <p className="text-xs text-[var(--text-secondary)]">Tournois {stats.annee}</p>
        <p className="text-xl font-semibold">{stats.tournois}</p>
      </div>
      <div className="rounded-lg border border-[var(--border)] p-3">
        <p className="text-xs text-[var(--text-secondary)]">Stages {stats.annee}</p>
        <p className="text-xl font-semibold">{stats.stages}</p>
      </div>
      <div className="rounded-lg border border-[var(--border)] p-3">
        <p className="text-xs text-[var(--text-secondary)]">Sem. compétition / repos</p>
        <p className="text-xl font-semibold">
          {stats.semainesCompetition} / {stats.semainesRepos}
        </p>
      </div>
      <div className="rounded-lg border border-[var(--border)] p-3">
        <p className="text-xs text-[var(--text-secondary)]">Pays visités</p>
        <p className="text-sm font-medium">{stats.paysVisites.join(", ") || "—"}</p>
      </div>
    </div>
  );
}
