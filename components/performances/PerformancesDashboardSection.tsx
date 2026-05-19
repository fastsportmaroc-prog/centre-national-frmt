"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { getPerformancesDashboard } from "@/lib/data/performances";
import type { PerformancesDashboard } from "@/lib/types/performances";
import { formatDate } from "@/lib/utils/dates";
import { Globe, TrendingUp } from "lucide-react";

export function PerformancesDashboardSection() {
  const [data, setData] = useState<PerformancesDashboard | null>(null);

  useEffect(() => {
    getPerformancesDashboard().then(setData);
  }, []);

  if (!data) return null;

  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Globe className="h-5 w-5 text-frmt-green" />
          Résultats internationaux Marocains
        </h2>
        <Link
          href="/performances/marocains"
          className="text-sm text-frmt-green hover:underline"
        >
          Voir tout →
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <h3 className="mb-2 text-sm font-medium text-frmt-red">Top ATP</h3>
          <ul className="space-y-1 text-sm">
            {data.topAtpHommes.slice(0, 3).map(({ joueur, ranking }) => (
              <li key={ranking.id}>
                <Link href={`/performances/joueurs/${joueur.id}`} className="hover:text-frmt-green">
                  {joueur.prenom} {joueur.nom} — #{ranking.rang}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="mb-2 text-sm font-medium text-frmt-green">Top WTA</h3>
          <ul className="space-y-1 text-sm">
            {data.topWtaFemmes.slice(0, 3).map(({ joueur, ranking }) => (
              <li key={ranking.id}>
                <Link href={`/performances/joueurs/${joueur.id}`} className="hover:text-frmt-green">
                  {joueur.prenom} {joueur.nom} — #{ranking.rang}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="mb-2 flex items-center gap-1 text-sm font-medium">
            <TrendingUp className="h-4 w-4" />
            Progression
          </h3>
          <ul className="space-y-1 text-sm">
            {data.progressions.slice(0, 3).map((p) => (
              <li key={p.joueur.id}>
                {p.joueur.prenom} {p.joueur.nom}{" "}
                <span className="text-frmt-green">+{p.variation}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-4 border-t border-border pt-4">
        <h3 className="mb-2 text-sm font-medium">Derniers résultats</h3>
        <ul className="space-y-2 text-sm">
          {data.resultatsRecents.slice(0, 4).map((m) => (
            <li key={m.id} className="flex flex-wrap items-center justify-between gap-2">
              <span>
                {m.tournoi} vs {m.adversaire.nom} ({m.adversaire.pays})
              </span>
              <Badge variant={m.resultat === "victoire" ? "success" : "muted"}>
                {m.score}
              </Badge>
            </li>
          ))}
        </ul>
        {data.prochainsMatchs[0] && (
          <p className="mt-3 text-xs text-muted">
            Prochain : {data.prochainsMatchs[0].tournoi} —{" "}
            {formatDate(data.prochainsMatchs[0].date_prevue)}
          </p>
        )}
      </div>
    </Card>
  );
}
