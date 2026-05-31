"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { StatsChartCard, StatsKpiRow } from "@/components/v2/statistiques/StatsKpiCard";
import { STATS_CHART, rechartsMargin } from "@/components/v2/statistiques/chart-theme";
import type { FinancierStatsData } from "@/lib/statistiques/types";

export function StatsFinancierView({ data }: { data: FinancierStatsData }) {
  return (
    <div className="space-y-6">
      <StatsKpiRow items={data.kpis} />

      <div className="grid gap-4 lg:grid-cols-2">
        <StatsChartCard title="Budget vs Réel par poste">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.budgetPostes} margin={rechartsMargin}>
              <CartesianGrid strokeDasharray="3 3" stroke={STATS_CHART.grid} />
              <XAxis dataKey="poste" tick={{ fill: STATS_CHART.axis, fontSize: 9 }} />
              <YAxis tick={{ fill: STATS_CHART.axis, fontSize: 10 }} />
              <Tooltip contentStyle={{ background: STATS_CHART.tooltipBg }} />
              <Legend />
              <Bar dataKey="prevu" fill="transparent" stroke={STATS_CHART.frmtGold} name="Prévu" />
              <Bar dataKey="reel" name="Réel">
                {data.budgetPostes.map((p) => (
                  <Cell
                    key={p.poste}
                    fill={p.reel > p.prevu ? STATS_CHART.frmtRed : STATS_CHART.frmtGreen}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </StatsChartCard>

        <StatsChartCard title="Répartition des dépenses">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data.repartition}
                dataKey="value"
                nameKey="name"
                innerRadius={50}
                outerRadius={90}
                label={({ name, value }) =>
                  `${name}: ${Math.round(value).toLocaleString("fr-FR")}`
                }
              >
                {data.repartition.map((e) => (
                  <Cell key={e.name} fill={e.fill} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: STATS_CHART.tooltipBg }} />
            </PieChart>
          </ResponsiveContainer>
        </StatsChartCard>

        {data.evolution.length > 0 && (
          <StatsChartCard title="Évolution mensuelle des dépenses" className="lg:col-span-2">
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={data.evolution} margin={rechartsMargin}>
                <CartesianGrid strokeDasharray="3 3" stroke={STATS_CHART.grid} />
                <XAxis dataKey="month" tick={{ fill: STATS_CHART.axis, fontSize: 10 }} />
                <YAxis tick={{ fill: STATS_CHART.axis, fontSize: 10 }} />
                <Tooltip contentStyle={{ background: STATS_CHART.tooltipBg }} />
                <Legend />
                <Line dataKey="stages" stroke={STATS_CHART.frmtGreen} name="Stages" />
                <Line dataKey="competitions" stroke={STATS_CHART.frmtRed} name="Compétitions" />
                <Line dataKey="total" stroke={STATS_CHART.frmtGold} name="Total" />
              </LineChart>
            </ResponsiveContainer>
          </StatsChartCard>
        )}
      </div>

      <StatsChartCard title="Dépassements budgétaires">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-xs text-muted">
                <th className="pb-2 pr-2">Poste</th>
                <th className="pb-2 pr-2">Budget</th>
                <th className="pb-2 pr-2">Réel</th>
                <th className="pb-2 pr-2">Écart</th>
                <th className="pb-2 pr-2">%</th>
                <th className="pb-2">Justification</th>
              </tr>
            </thead>
            <tbody>
              {data.depassements.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-4 text-center text-muted">
                    Aucun dépassement sur la période filtrée.
                  </td>
                </tr>
              ) : (
                data.depassements.map((r) => (
                  <tr key={r.poste} className="border-b border-[var(--border)]/50">
                    <td className="py-2 pr-2">{r.poste}</td>
                    <td className="py-2 pr-2">{r.budget.toLocaleString("fr-FR")}</td>
                    <td className="py-2 pr-2">{r.reel.toLocaleString("fr-FR")}</td>
                    <td className="py-2 pr-2 text-red-400">{r.ecart.toLocaleString("fr-FR")}</td>
                    <td className="py-2 pr-2">{r.pct}%</td>
                    <td className="py-2">{r.justification}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </StatsChartCard>
    </div>
  );
}
