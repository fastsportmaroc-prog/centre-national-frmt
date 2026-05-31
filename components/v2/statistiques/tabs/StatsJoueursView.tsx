"use client";

import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { StatsChartCard, StatsKpiRow } from "@/components/v2/statistiques/StatsKpiCard";
import { STATS_CHART, rechartsMargin } from "@/components/v2/statistiques/chart-theme";
import type { JoueursStatsData } from "@/lib/statistiques/types";

export function StatsJoueursView({ data }: { data: JoueursStatsData }) {
  return (
    <div className="space-y-6">
      <StatsKpiRow items={data.kpis} />

      <StatsChartCard title="Classement joueurs — présence & performance">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-xs text-muted">
                <th className="pb-2 pr-2">Rang</th>
                <th className="pb-2 pr-2">Joueur</th>
                <th className="pb-2 pr-2">Catégorie</th>
                <th className="pb-2 pr-2">Club</th>
                <th className="pb-2 pr-2">Stages</th>
                <th className="pb-2 pr-2">Jours</th>
                <th className="pb-2 pr-2">Présence</th>
                <th className="pb-2 pr-2">Classement</th>
              </tr>
            </thead>
            <tbody>
              {data.classement.map((r) => (
                <tr key={r.id} className="border-b border-[var(--border)]/50 hover:bg-white/5">
                  <td className="py-2 pr-2">{r.rang}</td>
                  <td className="py-2 pr-2">
                    <Link href={`/v2/joueurs/${r.id}`} className="text-frmt-gold hover:underline">
                      {r.joueur}
                    </Link>
                  </td>
                  <td className="py-2 pr-2">{r.categorie}</td>
                  <td className="py-2 pr-2">{r.club}</td>
                  <td className="py-2 pr-2">{r.nbStages}</td>
                  <td className="py-2 pr-2">{r.joursPresence}</td>
                  <td className="py-2 pr-2">{r.presencePct}%</td>
                  <td className="py-2 pr-2">{r.classement}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </StatsChartCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <StatsChartCard title="Top 15 — jours de présence">
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={data.topPresence} layout="vertical" margin={{ left: 80 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={STATS_CHART.grid} />
              <XAxis type="number" tick={{ fill: STATS_CHART.axis, fontSize: 10 }} />
              <YAxis
                type="category"
                dataKey="joueur"
                tick={{ fill: STATS_CHART.axis, fontSize: 9 }}
                width={75}
              />
              <Tooltip contentStyle={{ background: STATS_CHART.tooltipBg }} />
              <Bar dataKey="jours" fill={STATS_CHART.frmtGreen} name="Jours" />
            </BarChart>
          </ResponsiveContainer>
        </StatsChartCard>

        <StatsChartCard title="Présence vs Performance">
          <ResponsiveContainer width="100%" height={320}>
            <ScatterChart margin={rechartsMargin}>
              <CartesianGrid strokeDasharray="3 3" stroke={STATS_CHART.grid} />
              <XAxis
                type="number"
                dataKey="presence"
                name="Présence %"
                tick={{ fill: STATS_CHART.axis, fontSize: 10 }}
              />
              <YAxis
                type="number"
                dataKey="classement"
                name="Classement"
                reversed
                tick={{ fill: STATS_CHART.axis, fontSize: 10 }}
              />
              <ZAxis type="number" dataKey="competitions" range={[40, 200]} />
              <Tooltip contentStyle={{ background: STATS_CHART.tooltipBg }} />
              <Scatter data={data.presencePerformance} fill={STATS_CHART.frmtGold} />
            </ScatterChart>
          </ResponsiveContainer>
        </StatsChartCard>

        <StatsChartCard title="Joueurs par club d'origine">
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={data.parClub} margin={rechartsMargin}>
              <CartesianGrid strokeDasharray="3 3" stroke={STATS_CHART.grid} />
              <XAxis
                dataKey="club"
                tick={{ fill: STATS_CHART.axis, fontSize: 8 }}
                interval={0}
                angle={-25}
                textAnchor="end"
                height={70}
              />
              <YAxis tick={{ fill: STATS_CHART.axis, fontSize: 10 }} />
              <Tooltip contentStyle={{ background: STATS_CHART.tooltipBg }} />
              <Bar dataKey="count" fill={STATS_CHART.frmtGold} name="Joueurs" />
            </BarChart>
          </ResponsiveContainer>
        </StatsChartCard>

        <StatsChartCard title="Taux de présence par club">
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={data.parRegion} layout="vertical" margin={{ left: 100 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={STATS_CHART.grid} />
              <XAxis type="number" domain={[0, 100]} tick={{ fill: STATS_CHART.axis, fontSize: 10 }} />
              <YAxis
                type="category"
                dataKey="label"
                tick={{ fill: STATS_CHART.axis, fontSize: 9 }}
                width={95}
              />
              <Tooltip contentStyle={{ background: STATS_CHART.tooltipBg }} />
              <Bar dataKey="presence" fill={STATS_CHART.frmtGreen} name="Présence %" />
            </BarChart>
          </ResponsiveContainer>
        </StatsChartCard>
      </div>
    </div>
  );
}
