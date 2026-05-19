"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { getOccupationAlertes, getOccupationCentreResume } from "@/lib/data/occupation-cne";
import { getStagesProchains } from "@/lib/data/stages";
import type { StageProgramme } from "@/lib/types/stages";
import type { OccupationCneSnapshot } from "@/lib/types/occupation-cne";
import { formatDate } from "@/lib/utils/dates";
import { AlertTriangle, CalendarDays, Percent } from "lucide-react";

export function CneDashboardSection() {
  const [prochains, setProchains] = useState<StageProgramme[]>([]);
  const [resume, setResume] = useState<Awaited<ReturnType<typeof getOccupationCentreResume>> | null>(
    null
  );
  const [alertes, setAlertes] = useState<OccupationCneSnapshot[]>([]);

  useEffect(() => {
    Promise.all([getStagesProchains(4), getOccupationCentreResume(), getOccupationAlertes()]).then(
      ([s, r, a]) => {
        setProchains(s);
        setResume(r);
        setAlertes(a.slice(0, 3));
      }
    );
  }, []);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Centre National — CNE</h2>
        <Link href="/stages" className="text-sm text-frmt-red hover:underline">
          Voir tout
        </Link>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-4 lg:col-span-1">
          <p className="text-sm text-muted flex items-center gap-1">
            <Percent className="h-4 w-4" />
            Occupation temps réel
          </p>
          {resume ? (
            <>
              <p className="text-2xl font-semibold mt-1">{resume.taux_chambres_pct}%</p>
              <p className="text-xs text-muted">
                {resume.chambres_occupees}/{resume.chambres_total} chambres ·{" "}
                {resume.terrains_occupes}/{resume.terrains_total} terrains
              </p>
              {resume.alertes_surcharge > 0 && (
                <Badge variant="danger" className="mt-2">
                  {resume.alertes_surcharge} alerte(s)
                </Badge>
              )}
            </>
          ) : (
            <p className="text-sm text-muted mt-2">Chargement…</p>
          )}
          <Link href="/occupation" className="text-xs text-frmt-green mt-2 inline-block">
            Détail occupation →
          </Link>
        </Card>
        <Card className="p-4 lg:col-span-2">
          <p className="text-sm text-muted flex items-center gap-1 mb-2">
            <CalendarDays className="h-4 w-4" />
            Prochains stages
          </p>
          {prochains.length === 0 ? (
            <p className="text-sm text-muted">Aucun stage à venir.</p>
          ) : (
            <ul className="space-y-2">
              {prochains.map((s) => (
                <li key={s.id} className="flex justify-between gap-2 text-sm border-b border-border pb-2 last:border-0">
                  <span className="font-medium truncate">{s.stage_action}</span>
                  <span className="text-muted shrink-0">
                    {formatDate(s.date_debut)} · {s.categorie}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
      {alertes.length > 0 && (
        <Card className="p-4 border-amber-500/30">
          <p className="text-sm font-medium flex items-center gap-1 text-amber-400">
            <AlertTriangle className="h-4 w-4" />
            Alertes occupation
          </p>
          <ul className="mt-2 text-sm text-muted">
            {alertes.map((a) => (
              <li key={a.id}>
                {a.alerte ?? `Pav. ${a.pavillon} ch.${a.numero_chambre}`} — {a.taux_occupation_pct}%
              </li>
            ))}
          </ul>
        </Card>
      )}
    </section>
  );
}
