"use client";

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { IdCard } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { PASSPORT_STAT_ROWS } from "@/lib/v2/dashboard-colors";
import type { AdminDocumentAlertStats } from "@/lib/types/admin-document";

type Props = {
  stats: AdminDocumentAlertStats;
};

export function PassportVisaAlertsWidget({ stats }: Props) {
  const rows = PASSPORT_STAT_ROWS.map((r) => ({
    ...r,
    value: stats[r.key as keyof AdminDocumentAlertStats] as number,
  }));

  const total = rows.reduce((s, r) => s + r.value, 0);

  return (
    <Card className="v2-kpi-card border-t-[3px] border-t-violet-500 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <IdCard className="h-5 w-5 text-violet-400" />
          <h3 className="text-sm font-semibold text-[#e6edf3]">Alertes Passeports & Visas</h3>
        </div>
        <Link href="/v2/passeports" className="text-xs text-frmt-green hover:underline">
          Voir tout
        </Link>
      </div>
      {total === 0 ? (
        <p className="rounded-lg border border-emerald-500/25 bg-emerald-950/20 px-3 py-2 text-sm text-emerald-300">
          Aucune alerte documentaire.
        </p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {rows.map((r) => (
            <li
              key={r.key}
              className={cn(
                "flex items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-sm",
                r.border,
                r.bg,
                r.value > 0 && "ring-1 ring-white/5"
              )}
            >
              <span className="flex min-w-0 items-center gap-2">
                <span className={cn("h-2 w-2 shrink-0 rounded-full", r.dot)} aria-hidden />
                <span className={cn("truncate", r.labelText)}>{r.label}</span>
              </span>
              <span className={cn("shrink-0 text-lg font-bold tabular-nums", r.valueTone)}>
                {r.value}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
