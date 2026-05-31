"use client";

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
import type { CompetitionsStatsData } from "@/lib/statistiques/types";

export function StatsCompetitionsView({ data }: { data: CompetitionsStatsData }) {
  return (
    <div className="space-y-6">
      <StatsKpiRow items={data.kpis} />

      <div className="grid gap-4 lg:grid-cols-2">
        <StatsChartCard title="Tableau des médailles par compétition">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-xs text-muted">
                  <th className="pb-2 pr-2">Compétition</th>
                  <th className="pb-2 pr-2">🥇</th>
                  <th className="pb-2 pr-2">🥈</th>
                  <th className="pb-2 pr-2">🥉</th>
                  <th className="pb-2 pr-2">Total</th>
                  <th className="pb-2">Rang</th>
                </tr>
              </thead>
              <tbody>
                {data.medalTable.map((r) => (
                  <tr key={r.competition} className="border-b border-[var(--border)]/50">
                    <td className="py-2 pr-2">{r.competition}</td>
                    <td className="py-2 pr-2">{r.or}</td>
                    <td className="py-2 pr-2">{r.argent}</td>
                    <td className="py-2 pr-2">{r.bronze}</td>
                    <td className="py-2 pr-2">{r.total}</td>
                    <td className="py-2">{r.rang}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </StatsChartCard>

        <StatsChartCard title="Budget compétitions par poste">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data.budgetStacks} margin={rechartsMargin}>
              <CartesianGrid strokeDasharray="3 3" stroke={STATS_CHART.grid} />
              <XAxis dataKey="competition" tick={{ fill: STATS_CHART.axis, fontSize: 9 }} />
              <YAxis tick={{ fill: STATS_CHART.axis, fontSize: 10 }} />
              <Tooltip contentStyle={{ background: STATS_CHART.tooltipBg }} />
              <Legend />
              <Bar stackId="b" dataKey="transport" fill="#006233" name="Transport" />
              <Bar stackId="b" dataKey="hebergement" fill="#C9A227" name="Hébergement" />
              <Bar stackId="b" dataKey="perDiem" fill="#38a169" name="Per diem" />
              <Bar stackId="b" dataKey="inscription" fill="#3182ce" name="Inscription" />
              <Bar stackId="b" dataKey="equipement" fill="#805ad5" name="Équipement" />
              <Bar stackId="b" dataKey="divers" fill="#718096" name="Divers" />
            </BarChart>
          </ResponsiveContainer>
        </StatsChartCard>

        <StatsChartCard title="Performance vs Coût" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={280}>
            <ScatterChart margin={rechartsMargin}>
              <CartesianGrid strokeDasharray="3 3" stroke={STATS_CHART.grid} />
              <XAxis
                type="number"
                dataKey="cout"
                name="Coût"
                tick={{ fill: STATS_CHART.axis, fontSize: 10 }}
              />
              <YAxis
                type="number"
                dataKey="medailles"
                name="Médailles"
                tick={{ fill: STATS_CHART.axis, fontSize: 10 }}
              />
              <ZAxis type="number" dataKey="participants" range={[60, 400]} />
              <Tooltip
                cursor={{ strokeDasharray: "3 3" }}
                contentStyle={{ background: STATS_CHART.tooltipBg }}
              />
              <Scatter
                name="Compétitions"
                data={data.scatter}
                fill={STATS_CHART.frmtGreen}
              />
            </ScatterChart>
          </ResponsiveContainer>
        </StatsChartCard>
      </div>

      <StatsChartCard title="Toutes les compétitions">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-xs text-muted">
                <th className="pb-2 pr-2">Compétition</th>
                <th className="pb-2 pr-2">Type</th>
                <th className="pb-2 pr-2">Dates</th>
                <th className="pb-2 pr-2">Lieu</th>
                <th className="pb-2 pr-2">Budget alloué</th>
                <th className="pb-2 pr-2">Budget réel</th>
                <th className="pb-2 pr-2">Écart</th>
                <th className="pb-2">Statut</th>
              </tr>
            </thead>
            <tbody>
              {data.table.map((r) => (
                <tr key={r.id} className="border-b border-[var(--border)]/50">
                  <td className="py-2 pr-2">{r.competition}</td>
                  <td className="py-2 pr-2">{r.type}</td>
                  <td className="py-2 pr-2 text-xs">{r.dates}</td>
                  <td className="py-2 pr-2">{r.lieu}</td>
                  <td className="py-2 pr-2">{r.budgetAlloue.toLocaleString("fr-FR")}</td>
                  <td className="py-2 pr-2">{r.budgetReel.toLocaleString("fr-FR")}</td>
                  <td
                    className={`py-2 pr-2 ${r.ecart > 0 ? "text-red-400" : "text-green-400"}`}
                  >
                    {r.ecart.toLocaleString("fr-FR")}
                  </td>
                  <td className="py-2 capitalize">{r.statut}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </StatsChartCard>
    </div>
  );
}
