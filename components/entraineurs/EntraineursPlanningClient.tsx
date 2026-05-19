"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { getEntraineurs } from "@/lib/data/entraineurs";
import { getStagesProgramme } from "@/lib/data/stages";
import type { Entraineur } from "@/lib/types/entraineurs";
import type { StageProgramme } from "@/lib/types/stages";
import { formatDate } from "@/lib/utils/dates";
import { addWeeks, subWeeks } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getWeekDays } from "@/lib/utils/dates";

function stageOnDay(stage: StageProgramme, day: Date): boolean {
  const d = day.toISOString().slice(0, 10);
  return d >= stage.date_debut && d <= stage.date_fin && stage.statut !== "annule";
}

export function EntraineursPlanningClient() {
  const [weekRef, setWeekRef] = useState(new Date());
  const [entraineurs, setEntraineurs] = useState<Entraineur[]>([]);
  const [stages, setStages] = useState<StageProgramme[]>([]);

  const load = useCallback(async () => {
    const [e, s] = await Promise.all([getEntraineurs(), getStagesProgramme()]);
    setEntraineurs(e);
    setStages(s.filter((x) => x.statut !== "annule"));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const days = getWeekDays(weekRef);

  const byCoach = useMemo(() => {
    const map = new Map<string, StageProgramme[]>();
    for (const e of entraineurs) map.set(e.id, []);
    for (const s of stages) {
      for (const cid of s.entraineur_ids) {
        if (!map.has(cid)) map.set(cid, []);
        map.get(cid)!.push(s);
      }
    }
    return map;
  }, [entraineurs, stages]);

  return (
    <>
      <PageHeader
        title="Planning entraîneurs"
        description="Stages affectés par encadrant — semaine glissante"
      />
      <main className="flex-1 space-y-4 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/entraineurs">
            <Button variant="ghost" size="sm">
              Liste entraîneurs
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => setWeekRef(subWeeks(weekRef, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium">
              Semaine du {formatDate(days[0].toISOString())}
            </span>
            <Button variant="secondary" size="sm" onClick={() => setWeekRef(addWeeks(weekRef, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          {entraineurs.map((e) => {
            const coachStages = byCoach.get(e.id) ?? [];
            return (
              <Card key={e.id} className="premium overflow-x-auto p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-semibold">
                    {e.prenom} {e.nom}
                  </h3>
                  <Link href={`/entraineurs/${e.id}`}>
                    <Button variant="ghost" size="sm">
                      Fiche
                    </Button>
                  </Link>
                </div>
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted">
                      {days.map((d) => (
                        <th key={d.toISOString()} className="px-2 py-1 text-left font-medium">
                          {formatDate(d.toISOString(), "EEE dd/MM")}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      {days.map((day) => {
                        const dayStages = coachStages.filter((s) => stageOnDay(s, day));
                        return (
                          <td key={day.toISOString()} className="align-top px-2 py-2">
                            <div className="space-y-1">
                              {dayStages.length === 0 ? (
                                <span className="text-xs text-muted">—</span>
                              ) : (
                                dayStages.map((s) => (
                                  <Link
                                    key={s.id}
                                    href={`/stages/${s.id}`}
                                    className="block rounded-md border border-border/60 bg-surface-elevated px-2 py-1 text-xs hover:border-frmt-green/40"
                                  >
                                    {s.stage_action}
                                  </Link>
                                ))
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
              </Card>
            );
          })}
        </div>
      </main>
    </>
  );
}
