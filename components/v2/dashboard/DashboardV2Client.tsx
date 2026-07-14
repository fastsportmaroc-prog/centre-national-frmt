"use client";



import { useCallback, useEffect, useMemo, useState } from "react";

import Link from "next/link";

import { CalendarDays, Dumbbell, MapPinned, Trophy, Users, UsersRound } from "lucide-react";

import { KpiCard } from "./KpiCard";

import { DashboardPeriodBar } from "./DashboardPeriodBar";

import { DashboardCalendarStrip } from "./DashboardCalendarStrip";

import { DashboardOccupationHeatmap } from "./DashboardOccupationHeatmap";

import { DashboardRankingsWidget } from "./DashboardRankingsWidget";
import { ClassementsExternes } from "./ClassementsExternes";
import { DashboardClassementEvolutionWidget } from "./DashboardClassementEvolutionWidget";

import { DashboardProgrammationWidget } from "./DashboardProgrammationWidget";

import { DashboardCompetitionView } from "./DashboardCompetitionView";

import {

  loadDashboardDirection,

  type DashboardDirectionData,

} from "@/lib/v2/dashboard-direction-data";

import {

  rangeForDashboardPreset,

  type DashboardPeriod,

  type DashboardPeriodPreset,

} from "@/lib/v2/dashboard-period";



function DashboardSkeleton() {

  return (

    <div className="dashboard-page animate-pulse space-y-6 p-4 sm:p-6">

      <div className="h-16 rounded-xl bg-[var(--bg-card)]" />

      <div className="h-64 rounded-lg bg-[var(--bg-card)]" />

      <div className="h-48 rounded-lg bg-[var(--bg-card)]" />

      <div className="grid gap-4 lg:grid-cols-2">

        <div className="h-72 rounded-lg bg-[var(--bg-card)]" />

        <div className="h-72 rounded-lg bg-[var(--bg-card)]" />

      </div>

      <div className="h-96 rounded-lg bg-[var(--bg-card)]" />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">

        {[1, 2, 3, 4, 5, 6].map((i) => (

          <div key={i} className="h-24 rounded-lg bg-[var(--bg-card)]" />

        ))}

      </div>

    </div>

  );

}



export function DashboardV2Client() {

  const [preset, setPreset] = useState<DashboardPeriodPreset>("cette_semaine");

  const [period, setPeriod] = useState<DashboardPeriod>(() =>

    rangeForDashboardPreset("cette_semaine")

  );

  const [data, setData] = useState<DashboardDirectionData | null>(null);

  const [loading, setLoading] = useState(true);



  const load = useCallback(async (p: DashboardPeriod) => {

    setLoading(true);

    const result = await loadDashboardDirection(p);

    setData(result);

    setLoading(false);

  }, []);



  useEffect(() => {

    void load(period);

  }, [load, period]);



  function handlePresetChange(next: DashboardPeriodPreset) {

    setPreset(next);

    if (next !== "personnalise") {

      setPeriod(rangeForDashboardPreset(next));

    }

  }



  function handleCustomChange(patch: Partial<DashboardPeriod>) {

    setPreset("personnalise");

    setPeriod((prev) => {

      const merged = { ...prev, ...patch };

      return rangeForDashboardPreset("personnalise", merged);

    });

  }



  const kpis = data?.kpis;

  const occupationData = useMemo(

    () => data?.occupation ?? { slots: [], persons: [] },

    [data]

  );



  return (

    <div className="dashboard-page">

      <header className="border-b border-[var(--border-main)] px-4 py-5 sm:px-6">

        <p className="dashboard-breadcrumb">Centre National · FRMT</p>

        <h1 className="dashboard-title mt-1">Tableau de bord — Direction</h1>

        <p className="dashboard-subtitle mt-1.5">

          Vue d&apos;ensemble : stages, compétitions, planification, occupation des terrains,
          classements CNE et Classement International.

        </p>

      </header>



      <main className="space-y-8 p-4 sm:p-6">

        <DashboardPeriodBar

          preset={preset}

          period={period}

          onPresetChange={handlePresetChange}

          onCustomChange={handleCustomChange}

        />



        {loading || !data || !kpis ? (

          <DashboardSkeleton />

        ) : (

          <>

            <DashboardCalendarStrip

              period={period}

              events={data.calendarEvents}

              stages={data.stagesInPeriod}

              programmation={data.programmation}

              competitions={data.competition.competitions}

              coaches={data.coaches}

            />



            <DashboardOccupationHeatmap

              period={period}

              slots={occupationData.slots}

              joueurs={data.joueurs}

              coaches={data.coaches}

            />



            <ClassementsExternes
              rows={data.classementsExternes}
              onSynced={() => void load(period)}
            />

            <DashboardClassementEvolutionWidget />

            <section className="grid gap-4 lg:grid-cols-2">
              <DashboardProgrammationWidget events={data.programmation} />
              <DashboardRankingsWidget rows={data.rankings} />
            </section>



            <section>

              <div className="mb-3 flex items-center justify-between">

                <h2 className="dashboard-section-label flex items-center gap-2">

                  <CalendarDays className="h-4 w-4" /> Compétitions

                </h2>

                <Link

                  href="/competitions"

                  className="text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"

                >

                  Gérer les compétitions →

                </Link>

              </div>

              <DashboardCompetitionView data={data.competition} />

            </section>



            <section>

              <h2 className="dashboard-section-label mb-3">Résumé</h2>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">

                <KpiCard

                  label="Stages"

                  sublabel="sur la période"

                  value={kpis.stages}

                  href="/v2/stages"

                  icon={Trophy}

                  accent="navy"

                />

                <KpiCard

                  label="Compétitions"

                  sublabel="sur la période"

                  value={kpis.competitions}

                  href="/competitions"

                  icon={Trophy}

                  accent="gold"

                />

                <KpiCard

                  label="Joueurs"

                  sublabel="actifs"

                  value={kpis.joueurs}

                  href="/v2/joueurs"

                  icon={Users}

                  accent="green"

                />

                <KpiCard

                  label="Coachs"

                  sublabel="actifs"

                  value={kpis.coachs}

                  href="/v2/entraineurs"

                  icon={UsersRound}

                  accent="info"

                />

                <KpiCard

                  label="Programmation"

                  sublabel="événements"

                  value={kpis.evenements}

                  href="/v2/programmation-joueurs"

                  icon={Dumbbell}

                  accent="neutral"

                />

                <KpiCard

                  label="Occupation"

                  sublabel="terrains"

                  value={`${kpis.occupationPct}%`}

                  href="/v2/reservations"

                  icon={MapPinned}

                  accent="warning"

                />

              </div>

            </section>

          </>

        )}

      </main>

    </div>

  );

}

