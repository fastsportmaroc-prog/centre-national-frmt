"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { getStagesProchainsAvecAlertes } from "@/lib/data/stage-besoins";
import { getStagesProgramme } from "@/lib/data/stages";
import { formatDate } from "@/lib/utils/dates";
import { statutStageLabel } from "@/lib/utils/stage-automation";
import { AlertTriangle, CalendarDays, Trophy, Users } from "lucide-react";

export function CneDashboardSection() {
  const [prochains, setProchains] = useState<
    Awaited<ReturnType<typeof getStagesProchainsAvecAlertes>>
  >([]);
  const [totalStages, setTotalStages] = useState(0);

  useEffect(() => {
    Promise.all([getStagesProchainsAvecAlertes(5), getStagesProgramme()]).then(([s, all]) => {
      setProchains(s);
      const today = new Date().toISOString().split("T")[0]!;
      setTotalStages(all.filter((x) => x.date_fin >= today && x.statut !== "annule").length);
    });
  }, []);

  const alertCount = prochains.reduce((n, p) => n + p.alertes.length, 0);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Trophy className="h-5 w-5 text-frmt-green" />
          Stages — hub central
        </h2>
        <Link href="/stages" className="text-sm text-frmt-green hover:underline">
          Voir tout
        </Link>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-4 lg:col-span-1">
          <p className="text-sm text-muted flex items-center gap-1">
            <Users className="h-4 w-4" />
            Stages à venir / en cours
          </p>
          <p className="text-2xl font-semibold mt-1">{totalStages}</p>
          {alertCount > 0 && (
            <Badge variant="warning" className="mt-2">
              {alertCount} alerte(s) logistique
            </Badge>
          )}
          <Link href="/stages" className="text-xs text-frmt-green mt-2 inline-block">
            Créer ou gérer un stage →
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
              {prochains.map(({ stage, alertes }) => (
                <li
                  key={stage.id}
                  className="flex flex-col gap-1 border-b border-border pb-2 last:border-0 sm:flex-row sm:justify-between"
                >
                  <div>
                    <Link
                      href={`/stages/${stage.id}`}
                      className="font-medium truncate hover:text-frmt-green hover:underline"
                    >
                      {stage.stage_action}
                    </Link>
                    <p className="text-xs text-muted">
                      {formatDate(stage.date_debut)} · {stage.categorie} ·{" "}
                      {statutStageLabel(stage.statut)}
                    </p>
                    {alertes.length > 0 && (
                      <p className="text-xs text-amber-400 flex items-center gap-1 mt-0.5">
                        <AlertTriangle className="h-3 w-3 shrink-0" />
                        {alertes[0]}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-1 text-xs">
                    {stage.hebergement && <Badge variant="muted">Héb.</Badge>}
                    {stage.infrastructure_ids.length > 0 && (
                      <Badge variant="muted">{stage.infrastructure_ids.length} infra</Badge>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </section>
  );
}
