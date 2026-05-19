"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { PerformancesNav } from "./PerformancesNav";
import { Card } from "@/components/ui/Card";
import { getAllRankingsMarocains } from "@/lib/data/performances";
import { CIRCUIT_LABELS } from "@/lib/constants/performances";
import type { Joueur } from "@/lib/types/database";
import type { RankingSnapshot } from "@/lib/types/performances";
import { formatDate } from "@/lib/utils/dates";

export function PerformancesRankingsClient() {
  const [rows, setRows] = useState<{ joueur: Joueur; rankings: RankingSnapshot[] }[]>([]);

  useEffect(() => {
    getAllRankingsMarocains().then(setRows);
  }, []);

  return (
    <>
      <PageHeader
        title="Classements — joueurs marocains"
        description="ATP, WTA, ITF Pro, ITF Juniors, Futures, Challengers (MAR uniquement)"
      />
      <main className="flex-1 space-y-6 p-4 sm:p-6">
        <PerformancesNav />
        {rows.length === 0 ? (
          <p className="text-muted">Chargement…</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {rows.map(({ joueur, rankings }) => (
              <Card key={joueur.id}>
                <Link
                  href={`/performances/joueurs/${joueur.id}`}
                  className="mb-3 block font-semibold hover:text-frmt-green"
                >
                  {joueur.prenom} {joueur.nom}
                </Link>
                {rankings.length === 0 ? (
                  <p className="text-sm text-muted">Aucun classement synchronisé.</p>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {rankings.map((r) => (
                      <li
                        key={r.id}
                        className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
                      >
                        <span>{CIRCUIT_LABELS[r.circuit]}</span>
                        <span className="font-medium">#{r.rang}</span>
                        <span className="text-muted">{r.points} pts</span>
                        {r.variation != null && (
                          <span
                            className={
                              r.variation >= 0 ? "text-frmt-green" : "text-frmt-red"
                            }
                          >
                            {r.variation >= 0 ? "+" : ""}
                            {r.variation}
                          </span>
                        )}
                        <span className="text-xs text-muted">{formatDate(r.date_classement)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
