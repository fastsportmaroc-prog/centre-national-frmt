"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  BedDouble,
  CalendarDays,
  LayoutDashboard,
  Plane,
  Trophy,
  Users,
  UtensilsCrossed,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { loadDashboardV2, type DashboardV2Data } from "@/lib/v2/dashboard-data";
import { loadDashboardCompetition } from "@/lib/v2/dashboard-competition-data";
import type { CompetitionDashboardSummary } from "@/lib/competitions/dashboard-summary";
import { exportStagePDF } from "@/lib/pdf/pdf-exports";
import { KpiCard } from "./KpiCard";
import { StageDashboardCard } from "./StageDashboardCard";
import { DashboardAlertsPanel } from "./DashboardAlertsPanel";
import { PassportVisaAlertsWidget } from "./PassportVisaAlertsWidget";
import { WeekTimeline } from "./WeekTimeline";
import { DashboardCompetitionView } from "./DashboardCompetitionView";

type DashboardView = "logistique" | "technique" | "competition";

const VIEWS: {
  id: DashboardView;
  label: string;
  description: string;
  activeClass: string;
}[] = [
  {
    id: "logistique",
    label: "Vue logistique",
    description: "Stages, hébergement, repas, occupation du centre",
    activeClass: "border-frmt-green bg-frmt-green/10 text-frmt-green shadow-sm shadow-frmt-green/10",
  },
  {
    id: "competition",
    label: "Vue compétition",
    description: "Compétitions, visas à prévoir, passeports et billets",
    activeClass: "border-frmt-gold bg-frmt-gold/10 text-frmt-gold shadow-sm shadow-frmt-gold/15",
  },
  {
    id: "technique",
    label: "Vue technique",
    description: "Planning stages et préparation terrain",
    activeClass: "border-sky-500 bg-sky-500/10 text-sky-200 shadow-sm shadow-sky-500/15",
  },
];

function DashboardSkeleton() {
  return (
    <div className="animate-pulse space-y-6 p-4 sm:p-6">
      <div className="h-20 rounded-xl bg-[#161b22]" />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-48 rounded-lg bg-[#161b22]" />
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 rounded-lg bg-[#161b22]" />
        ))}
      </div>
    </div>
  );
}

export function DashboardV2Client() {
  const [data, setData] = useState<DashboardV2Data | null>(null);
  const [competitionData, setCompetitionData] = useState<CompetitionDashboardSummary | null>(
    null
  );
  const [view, setView] = useState<DashboardView>("logistique");

  const load = useCallback(async () => {
    const [dash, comp] = await Promise.all([loadDashboardV2(), loadDashboardCompetition()]);
    setData(dash);
    setCompetitionData(comp);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const activeViewMeta = VIEWS.find((v) => v.id === view)!;

  const stagesToShow = useMemo(() => {
    if (!data) return [];
    if (view === "technique") return data.stagesAvenir.slice(0, 6);
    return data.stagesAvenir;
  }, [data, view]);

  if (!data || !competitionData) return <DashboardSkeleton />;

  return (
    <>
      <header className="border-b border-[#30363d] bg-gradient-to-br from-[#0d1117] via-[#161b22] to-[#0d1117] px-4 py-6 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-frmt-gold">
              Centre National · FRMT
            </p>
            <div className="mt-1 flex items-center gap-2">
              <LayoutDashboard className="h-7 w-7 text-frmt-green" />
              <h1 className="text-2xl font-bold text-[#e6edf3] sm:text-3xl">Tableau de bord</h1>
            </div>
            <p className="mt-2 text-sm text-[#c9d1d9]">{activeViewMeta.description}</p>
          </div>
          {view === "competition" && (
            <Link
              href="/competitions"
              className="rounded-lg border border-frmt-green/40 bg-frmt-green/10 px-4 py-2 text-sm font-medium text-frmt-green hover:bg-frmt-green/20"
            >
              Gérer les compétitions
            </Link>
          )}
        </div>

        <nav
          className="mt-5 flex flex-wrap gap-2"
          role="tablist"
          aria-label="Vues du tableau de bord"
        >
          {VIEWS.map((v) => (
            <button
              key={v.id}
              type="button"
              role="tab"
              aria-selected={view === v.id}
              onClick={() => setView(v.id)}
              className={cn(
                "rounded-lg border px-4 py-2 text-sm font-medium transition",
                view === v.id
                  ? v.activeClass
                  : "border-[#30363d] bg-[#0d1117]/60 text-[#8b949e] hover:border-[#484f58] hover:text-white"
              )}
            >
              {v.label}
              {v.id === "competition" && competitionData.kpis.visas_a_prevoir > 0 && (
                <span className="ml-2 inline-flex min-w-[1.25rem] justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-bold text-white shadow-[0_0_8px_rgba(239,68,68,0.5)]">
                  {competitionData.kpis.visas_a_prevoir}
                </span>
              )}
              {v.id === "logistique" && data.alertesByLevel.urgent.length > 0 && (
                <span className="ml-2 inline-flex min-w-[1.25rem] justify-center rounded-full bg-red-500/90 px-1.5 text-[11px] font-bold text-white">
                  {data.alertesByLevel.urgent.length}
                </span>
              )}
            </button>
          ))}
        </nav>
      </header>

      <main className="space-y-8 p-4 sm:p-6">
        {view === "competition" ? (
          <DashboardCompetitionView data={competitionData} />
        ) : (
          <>
            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard
                label="Stages"
                sublabel="à venir"
                value={data.nbStagesAvenir}
                href="/v2/stages"
                icon={Trophy}
                accent="navy"
              />
              <KpiCard
                label="Joueurs"
                sublabel="actifs"
                value={data.nbJoueurs}
                href="/v2/joueurs"
                icon={Users}
                accent="green"
              />
              <KpiCard
                label="Occupation"
                sublabel="courts"
                value={`${data.occupationMax}%`}
                href="/v2/infrastructures"
                icon={CalendarDays}
                accent="warning"
              />
              <KpiCard
                label="Alertes"
                sublabel="actives"
                value={data.alertes.length}
                href="/v2/dashboard"
                icon={AlertTriangle}
                accent="danger"
                pulse
              />
            </section>

            {view === "logistique" && (
              <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <KpiCard
                  label="Chambres"
                  sublabel="occupées"
                  value={data.kpiLogistique.chambresOccupees}
                  href="/v2/hebergement"
                  icon={BedDouble}
                  accent="navy"
                />
                <KpiCard
                  label="Repas"
                  sublabel="prévus"
                  value={data.kpiLogistique.repasPrevus}
                  href="/v2/restauration"
                  icon={UtensilsCrossed}
                  accent="green"
                />
                <KpiCard
                  label="Billets"
                  sublabel="en attente"
                  value={data.kpiLogistique.billetsEnAttente}
                  href="/v2/billets-avion"
                  icon={Plane}
                  accent="warning"
                  pulse
                />
                <KpiCard
                  label="MAD"
                  sublabel="à payer"
                  value={data.kpiLogistique.madAPayer.toLocaleString("fr-FR")}
                  href="/v2/budget"
                  icon={Wallet}
                  accent="danger"
                />
              </section>
            )}

            {view === "logistique" && (
              <WeekTimeline days={data.weekTimeline} prochainStage={data.prochainStage} />
            )}

            {(view === "logistique" || view === "technique") && (
              <section>
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-[#484f58]">
                  Stages à venir
                </h2>
                {stagesToShow.length === 0 ? (
                  <div className="v2-kpi-card p-8 text-center">
                    <p className="text-3xl">🎾</p>
                    <p className="mt-2 font-medium text-[#e6edf3]">Aucun stage planifié</p>
                    <p className="mt-1 text-sm text-[#8b949e]">
                      Créez votre premier stage pour commencer
                    </p>
                  </div>
                ) : (
                  <div className="frmt-stagger-list grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {stagesToShow.map((s) => (
                      <div key={s.id} className="frmt-stagger-item">
                        <StageDashboardCard
                          stage={s}
                          onPdf={() =>
                            exportStagePDF({
                              stage_action: s.stage_action,
                              categorie: s.categorie,
                              date_debut: s.date_debut,
                              date_fin: s.date_fin,
                              lieu: s.lieu,
                              statut: String(s.statut),
                              notes: s.notes,
                            })
                          }
                        />
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {view === "logistique" && (
              <PassportVisaAlertsWidget stats={data.passportVisaStats} />
            )}

            <section>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-[#484f58]">
                Alertes priorisées
              </h2>
              <div className="v2-kpi-card p-4">
                <DashboardAlertsPanel byLevel={data.alertesByLevel} />
              </div>
            </section>

            {view === "logistique" && (
              <section>
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-[#484f58]">
                  Occupation centre
                </h2>
                <div className="v2-kpi-card space-y-3 p-4">
                  {data.occupation.map((o) => (
                    <div key={o.infrastructure_id}>
                      <div className="mb-1 flex justify-between text-sm text-[#e6edf3]">
                        <span>{o.nom}</span>
                        <span className="text-[#8b949e]">{o.pct}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-[#0d1117]">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            o.pct <= 50
                              ? "bg-emerald-500"
                              : o.pct <= 80
                                ? "bg-amber-500"
                                : "bg-red-500"
                          )}
                          style={{ width: `${o.pct}%` }}
                        />
                      </div>
                    </div>
                  ))}
                  {data.occupation.length === 0 && (
                    <p className="text-sm text-[#8b949e]">Aucune infrastructure chargée.</p>
                  )}
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </>
  );
}
