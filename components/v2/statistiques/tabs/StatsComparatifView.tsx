"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { StatsChartCard, StatsKpiRow } from "@/components/v2/statistiques/StatsKpiCard";
import { STATS_CHART, rechartsMargin } from "@/components/v2/statistiques/chart-theme";
import type { ComparatifStatsData } from "@/lib/statistiques/types";

export function StatsComparatifView({ data }: { data: ComparatifStatsData }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <h3 className="mb-2 text-sm font-semibold text-frmt-green">Stages</h3>
          <StatsKpiRow items={data.stagesKpis} />
        </div>
        <div>
          <h3 className="mb-2 text-sm font-semibold text-frmt-red">Compétitions</h3>
          <StatsKpiRow items={data.competitionsKpis} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <StatsChartCard title="Profil saison (radar)">
          <ResponsiveContainer width="100%" height={320}>
            <RadarChart data={data.radar}>
              <PolarGrid stroke={STATS_CHART.grid} />
              <PolarAngleAxis dataKey="subject" tick={{ fill: STATS_CHART.axis, fontSize: 10 }} />
              <PolarRadiusAxis tick={{ fill: STATS_CHART.axis, fontSize: 9 }} />
              <Radar
                name="Stages"
                dataKey="stages"
                stroke={STATS_CHART.frmtRed}
                fill={STATS_CHART.frmtRed}
                fillOpacity={0.25}
              />
              <Radar
                name="Compétitions"
                dataKey="competitions"
                stroke={STATS_CHART.frmtBlue}
                fill={STATS_CHART.frmtBlue}
                fillOpacity={0.25}
              />
              <Legend />
              <Tooltip contentStyle={{ background: STATS_CHART.tooltipBg }} />
            </RadarChart>
          </ResponsiveContainer>
        </StatsChartCard>

        <StatsChartCard title="Comparaison budgétaire mensuelle">
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={data.budgetMensuel} margin={rechartsMargin}>
              <CartesianGrid strokeDasharray="3 3" stroke={STATS_CHART.grid} />
              <XAxis dataKey="month" tick={{ fill: STATS_CHART.axis, fontSize: 10 }} />
              <YAxis tick={{ fill: STATS_CHART.axis, fontSize: 10 }} />
              <Tooltip contentStyle={{ background: STATS_CHART.tooltipBg }} />
              <Legend />
              <Bar dataKey="stages" fill={STATS_CHART.frmtGreen} name="Stages" />
              <Bar dataKey="competitions" fill={STATS_CHART.frmtRed} name="Compétitions" />
              <Line type="monotone" dataKey="cumul" stroke={STATS_CHART.frmtGold} name="Cumul" />
            </ComposedChart>
          </ResponsiveContainer>
        </StatsChartCard>

        <StatsChartCard title="Calendrier annuel unifié" className="lg:col-span-2">
          <div className="space-y-2">
            {data.timeline.slice(0, 20).map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-3 rounded-lg border border-[var(--border)]/60 px-3 py-2 text-sm"
              >
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${
                    t.kind === "stage" ? "bg-frmt-green" : "bg-frmt-red"
                  }`}
                />
                <span className="min-w-[100px] text-xs text-muted">
                  {t.start} → {t.end}
                </span>
                <span className="flex-1 font-medium">{t.label}</span>
                <span className="text-xs text-muted">{t.stat}</span>
              </div>
            ))}
          </div>
        </StatsChartCard>
      </div>
    </div>
  );
}
