"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  BedDouble,
  CalendarDays,
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
}[] = [
  {
    id: "logistique",
    label: "Vue logistique",
    description: "Stages, hébergement, repas, occupation du centre",
  },
  {
    id: "competition",
    label: "Vue compétition",
    description: "Compétitions, visas à prévoir, passeports et billets",
  },
  {
    id: "technique",
    label: "Vue technique",
    description: "Planning stages et préparation terrain",
  },
];

function DashboardSkeleton() {
  return (
    <div className="dashboard-page animate-pulse space-y-6 p-4 sm:p-6">
      <div className="h-20 rounded-lg bg-[var(--bg-card)]" />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-48 rounded-lg bg-[var(--bg-card)]" />
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 rounded-lg bg-[var(--bg-card)]" />
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
    <div className="dashboard-page">
      <header className="border-b border-[var(--border-main)] px-4 py-5 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="dashboard-breadcrumb">Centre National · FRMT</p>
            <h1 className="dashboard-title mt-1">Tableau de bord</h1>
            <p className="dashboard-subtitle mt-1.5">{activeViewMeta.description}</p>
          </div>
          {view === "competition" && (
            <Link
              href="/competitions"
              className="rounded-lg border border-[var(--border-main)] bg-[var(--bg-inset)] px-4 py-2 text-[11px] font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
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
          {VIEWS.map((v) => {
            const competitionBadge =
              v.id === "competition" && competitionData.kpis.visas_a_prevoir > 0
                ? competitionData.kpis.visas_a_prevoir
                : 0;
            const logistiqueBadge =
              v.id === "logistique" && data.alertesByLevel.urgent.length > 0
                ? data.alertesByLevel.urgent.length
                : 0;
            const badge = competitionBadge || logistiqueBadge;

            return (
              <button
                key={v.id}
                type="button"
                role="tab"
                aria-selected={view === v.id}
                onClick={() => setView(v.id)}
                className={cn(
                  "dashboard-view-tab",
                  view === v.id && "dashboard-view-tab--active"
                )}
              >
                {v.label}
                {badge > 0 && (
                  <span className="dashboard-view-tab-badge">{badge}</span>
                )}
              </button>
            );
          })}
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
                <h2 className="dashboard-section-label mb-3">Stages à venir</h2>
                {stagesToShow.length === 0 ? (
                  <div className="v2-kpi-card p-8 text-center">
                    <p className="text-3xl">🎾</p>
                    <p className="mt-2 text-[13px] font-medium text-[var(--text-primary)]">
                      Aucun stage planifié
                    </p>
                    <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                      Créez votre premier stage pour commencer
                    </p>
                  </div>
                ) : (
                  <div className="frmt-stagger-list grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {stagesToShow.map((s) => (
                      <div key={s.id} className="frmt-stagger-item flex h-full min-h-0">
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
              <h2 className="dashboard-section-label mb-3">Alertes priorisées</h2>
              <div className="v2-kpi-card p-4">
                <DashboardAlertsPanel byLevel={data.alertesByLevel} />
              </div>
            </section>

            {view === "logistique" && (
              <section>
                <h2 className="dashboard-section-label mb-3">Occupation centre</h2>
                <div className="v2-kpi-card space-y-3 p-4">
                  {data.occupation.map((o) => (
                    <div key={o.infrastructure_id}>
                      <div className="mb-1 flex justify-between text-[12px] text-[var(--text-primary)]">
                        <span>{o.nom}</span>
                        <span className="text-[var(--text-muted)]">{o.pct}%</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-[var(--bg-inset)]">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            o.pct <= 50
                              ? "bg-[var(--color-green)]"
                              : o.pct <= 80
                                ? "bg-[var(--color-amber)]"
                                : "bg-[var(--color-red)]"
                          )}
                          style={{ width: `${o.pct}%` }}
                        />
                      </div>
                    </div>
                  ))}
                  {data.occupation.length === 0 && (
                    <p className="text-[11px] text-[var(--text-muted)]">Aucune infrastructure chargée.</p>
                  )}
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
