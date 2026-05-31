"use client";

import type { RapportFinancierRow } from "@/lib/rapports/types";

export function BudgetComparisonChart({ rows }: { rows: RapportFinancierRow[] }) {
  const max = Math.max(...rows.map((r) => Math.max(r.budget, r.reel)), 1);
  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <div key={r.poste}>
          <div className="mb-1 flex justify-between text-xs">
            <span className="font-medium">{r.poste}</span>
            <span className="text-muted">
              {r.reel.toLocaleString("fr-FR")} / {r.budget.toLocaleString("fr-FR")} MAD
            </span>
          </div>
          <div className="relative h-3 overflow-hidden rounded bg-[#2a2d3a]">
            <div
              className="absolute inset-y-0 left-0 rounded bg-frmt-green/40"
              style={{ width: `${(r.budget / max) * 100}%` }}
            />
            <div
              className="absolute inset-y-0 left-0 rounded bg-frmt-red/70"
              style={{ width: `${(r.reel / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
      <p className="text-[10px] text-muted">Vert : budget · Rouge : réel</p>
    </div>
  );
}
