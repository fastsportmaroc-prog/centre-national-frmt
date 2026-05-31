"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  getOccupationCentre,
  occupationBarColor,
  type OccupationCentreResult,
  type PeriodeOccupation,
} from "@/lib/data/centre-occupation";
import { formatDate } from "@/lib/utils/dates";
import { BarChart3 } from "lucide-react";

function OccupationBarRow({ ligne }: { ligne: OccupationCentreResult["lignes"][0] }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-0.5">
        <span className="truncate">{ligne.nom}</span>
        <span className="text-muted shrink-0 ml-2">{ligne.pct}%</span>
      </div>
      <div className="h-2 rounded-full bg-white/10 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${occupationBarColor(ligne.pct)}`}
          style={{ width: `${ligne.pct}%` }}
        />
      </div>
    </div>
  );
}

export function OccupationWidget() {
  const [periode, setPeriode] = useState<PeriodeOccupation>("semaine");
  const [data, setData] = useState<OccupationCentreResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getOccupationCentre(periode)
      .then(setData)
      .finally(() => setLoading(false));
  }, [periode]);

  const topLines = data?.lignes
    .filter((l) => l.type === "terrain")
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 5) ?? [];

  return (
    <Card className="premium p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-frmt-green" />
          <h3 className="font-semibold text-sm">Occupation du centre</h3>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {(["semaine", "mois"] as const).map((p) => (
              <Button
                key={p}
                size="sm"
                variant={periode === p ? "primary" : "secondary"}
                onClick={() => setPeriode(p)}
              >
                {p === "semaine" ? "Semaine" : "Mois"}
              </Button>
            ))}
          </div>
          <Link href="/infrastructures" className="text-xs text-frmt-green hover:underline">
            Détail →
          </Link>
        </div>
        {data && (
          <p className="w-full text-xs text-muted">
            {formatDate(data.date_debut)} → {formatDate(data.date_fin)}
          </p>
        )}
      </div>
      {loading ? (
        <p className="text-sm text-muted">Chargement occupation…</p>
      ) : topLines.length === 0 ? (
        <p className="text-sm text-muted">Aucune donnée d&apos;occupation pour cette période.</p>
      ) : (
        <div className="space-y-2">
          {topLines.map((l) => (
            <OccupationBarRow key={l.infrastructure_id} ligne={l} />
          ))}
        </div>
      )}
    </Card>
  );
}
