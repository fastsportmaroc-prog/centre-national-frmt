"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { DashboardRankingRow } from "@/app/api/dashboard/rankings/route";

type Props = {
  rows: DashboardRankingRow[];
};

type RankingMode = "simple" | "double";

function rankValue(row: DashboardRankingRow, mode: RankingMode): number | null {
  const raw = mode === "simple" ? row.classement_simple : row.classement_double;
  if (!raw) return null;
  const n = parseInt(String(raw).replace(/[^0-9]/g, ""), 10);
  return Number.isNaN(n) ? null : n;
}

function EvolutionBadge({ variation }: { variation: number | null }) {
  if (variation === null) {
    return <span className="inline-flex items-center text-[var(--text-muted)]"><Minus className="h-3.5 w-3.5" /></span>;
  }
  // variation < 0 => le rang a baissé => progression
  if (variation < 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[var(--color-green,#16a34a)]">
        <TrendingUp className="h-3.5 w-3.5" />
        {Math.abs(variation)}
      </span>
    );
  }
  if (variation > 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[var(--color-red,#dc2626)]">
        <TrendingDown className="h-3.5 w-3.5" />
        {variation}
      </span>
    );
  }
  return <span className="inline-flex items-center text-[var(--text-muted)]"><Minus className="h-3.5 w-3.5" /></span>;
}

export function DashboardRankingsWidget({ rows }: Props) {
  const [mode, setMode] = useState<RankingMode>("simple");

  const sorted = useMemo(() => {
    return rows
      .map((r) => ({ row: r, rank: rankValue(r, mode) }))
      .filter((x) => x.rank !== null)
      .sort((a, b) => (a.rank ?? Infinity) - (b.rank ?? Infinity))
      .slice(0, 12);
  }, [rows, mode]);

  return (
    <div className="v2-kpi-card p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="dashboard-section-label">Classement joueurs</h2>
        <div className="flex rounded-lg border border-[var(--border-main)] p-0.5">
          {(["simple", "double"] as RankingMode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={cn(
                "rounded-md px-3 py-1 text-[11px] font-medium capitalize transition",
                mode === m
                  ? "bg-[var(--frmt-navy,#0f172a)] text-white"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              )}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {sorted.length === 0 ? (
        <p className="py-6 text-center text-[12px] text-[var(--text-muted)]">
          Aucun classement {mode} disponible.
        </p>
      ) : (
        <ul className="space-y-0.5">
          {sorted.map(({ row, rank }, i) => (
            <li key={row.joueur_id}>
              <Link
                href={`/v2/joueurs/${row.joueur_id}`}
                className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-[var(--bg-hover)]"
              >
                <span className="w-5 shrink-0 text-center text-[11px] font-semibold text-[var(--text-muted)]">
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1 truncate text-[12px] text-[var(--text-primary)]">
                  {row.prenom} {row.nom}
                  {row.categorie && (
                    <span className="ml-1.5 text-[10px] text-[var(--text-muted)]">{row.categorie}</span>
                  )}
                </span>
                <span className="shrink-0 text-[12px] font-medium text-[var(--text-primary)]">
                  #{rank}
                </span>
                <span className="w-10 shrink-0 text-right text-[11px]">
                  <EvolutionBadge variation={row.variation} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-[10px] text-[var(--text-muted)]">
        Évolution vs relevé précédent — vert = progression, rouge = recul.
      </p>
    </div>
  );
}
