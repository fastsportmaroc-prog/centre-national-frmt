"use client";

import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
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
import { StatsHeatmap } from "@/components/v2/statistiques/StatsHeatmap";
import { STATS_CHART, rechartsMargin } from "@/components/v2/statistiques/chart-theme";
import type { StagesStatsData } from "@/lib/statistiques/types";
import { useState } from "react";

export function StatsStagesView({ data }: { data: StagesStatsData }) {
  const [page, setPage] = useState(0);
  const pageSize = 10;
  const rows = data.stageTable.slice(page * pageSize, (page + 1) * pageSize);
  const totalPages = Math.ceil(data.stageTable.length / pageSize) || 1;

  return (
    <div className="space-y-6">
      <StatsKpiRow items={data.kpis} />

      <div className="grid gap-4 lg:grid-cols-2">
        <StatsChartCard title="Taux de présence par stage">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data.presenceByStage} margin={rechartsMargin}>
              <CartesianGrid strokeDasharray="3 3" stroke={STATS_CHART.grid} />
              <XAxis dataKey="label" tick={{ fill: STATS_CHART.axis, fontSize: 10 }} />
              <YAxis tick={{ fill: STATS_CHART.axis, fontSize: 10 }} domain={[0, 100]} />
              <Tooltip
                contentStyle={{
                  background: STATS_CHART.tooltipBg,
                  border: `1px solid ${STATS_CHART.tooltipBorder}`,
                }}
              />
              <Bar dataKey="presence" name="Présence %">
                {data.presenceByStage.map((e) => (
                  <Cell key={e.stageId} fill={e.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </StatsChartCard>

        <StatsChartCard title="Évolution participants (par mois)">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data.participantsEvolution} margin={rechartsMargin}>
              <CartesianGrid strokeDasharray="3 3" stroke={STATS_CHART.grid} />
              <XAxis dataKey="month" tick={{ fill: STATS_CHART.axis, fontSize: 10 }} />
              <YAxis tick={{ fill: STATS_CHART.axis, fontSize: 10 }} />
              <Tooltip contentStyle={{ background: STATS_CHART.tooltipBg }} />
              <Legend />
              <Line type="monotone" dataKey="U8" stroke="#a855f7" dot={false} />
              <Line type="monotone" dataKey="U10" stroke="#f472b6" dot={false} />
              <Line type="monotone" dataKey="U12" stroke="#3b82f6" dot={false} />
              <Line type="monotone" dataKey="U14" stroke="#22c55e" dot={false} />
              <Line type="monotone" dataKey="U16" stroke="#f97316" dot={false} />
              <Line type="monotone" dataKey="U18" stroke={STATS_CHART.frmtGold} dot={false} />
              <Line type="monotone" dataKey="Elite Pro" stroke={STATS_CHART.frmtRed} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </StatsChartCard>

        <StatsChartCard title="Répartition par catégorie">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={data.repartitionCategorie}
                dataKey="value"
                nameKey="name"
                innerRadius={55}
                outerRadius={90}
                label={({ name, percent }) =>
                  `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                }
              >
                {data.repartitionCategorie.map((e) => (
                  <Cell key={e.name} fill={e.fill} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: STATS_CHART.tooltipBg }} />
            </PieChart>
          </ResponsiveContainer>
        </StatsChartCard>

        <StatsChartCard title="Occupation terrains & infrastructures">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data.terrainsOccupation} margin={rechartsMargin}>
              <CartesianGrid strokeDasharray="3 3" stroke={STATS_CHART.grid} />
              <XAxis dataKey="terrain" tick={{ fill: STATS_CHART.axis, fontSize: 10 }} />
              <YAxis tick={{ fill: STATS_CHART.axis, fontSize: 10 }} />
              <Tooltip contentStyle={{ background: STATS_CHART.tooltipBg }} />
              <Legend />
              <Bar dataKey="heures" fill={STATS_CHART.frmtGreen} name="Heures" />
              <Bar dataKey="capacite" fill={STATS_CHART.frmtGold} name="Capacité" />
            </BarChart>
          </ResponsiveContainer>
        </StatsChartCard>

        <StatsChartCard title="Bilan kinésithérapie par stage" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={data.kineByStage} margin={rechartsMargin}>
              <CartesianGrid strokeDasharray="3 3" stroke={STATS_CHART.grid} />
              <XAxis dataKey="stage" tick={{ fill: STATS_CHART.axis, fontSize: 10 }} />
              <YAxis tick={{ fill: STATS_CHART.axis, fontSize: 10 }} />
              <Tooltip contentStyle={{ background: STATS_CHART.tooltipBg }} />
              <Legend />
              <Bar stackId="k" dataKey="Musculaire" fill="#006233" />
              <Bar stackId="k" dataKey="Articulaire" fill="#C9A227" />
              <Bar stackId="k" dataKey="Préventif" fill="#38a169" />
              <Bar stackId="k" dataKey="Autre" fill="#805ad5" />
              <Line type="monotone" dataKey="joueurs" stroke={STATS_CHART.frmtRed} name="Joueurs" />
            </ComposedChart>
          </ResponsiveContainer>
        </StatsChartCard>

        <StatsChartCard title="Activité stages (heatmap annuelle)" className="lg:col-span-2">
          <StatsHeatmap cells={data.heatmap} />
        </StatsChartCard>
      </div>

      <StatsChartCard title="Détail par stage">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-xs text-muted">
                <th className="pb-2 pr-3">Stage</th>
                <th className="pb-2 pr-3">Dates</th>
                <th className="pb-2 pr-3">Durée</th>
                <th className="pb-2 pr-3">Joueurs</th>
                <th className="pb-2 pr-3">Coachs</th>
                <th className="pb-2 pr-3">Présence</th>
                <th className="pb-2 pr-3">Kiné</th>
                <th className="pb-2 pr-3">Coût</th>
                <th className="pb-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-[var(--border)]/50">
                  <td className="py-2 pr-3">{r.stage}</td>
                  <td className="py-2 pr-3 text-xs">{r.dates}</td>
                  <td className="py-2 pr-3">{r.duree} j</td>
                  <td className="py-2 pr-3">{r.joueurs}</td>
                  <td className="py-2 pr-3">{r.coachs}</td>
                  <td className="py-2 pr-3">{r.presence}%</td>
                  <td className="py-2 pr-3">{r.kine}</td>
                  <td className="py-2 pr-3">{r.cout.toLocaleString("fr-FR")} MAD</td>
                  <td className="py-2">
                    <Link href={`/v2/stages/${r.id}`} className="text-frmt-gold hover:underline">
                      Voir
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex justify-end gap-2">
          <button
            type="button"
            disabled={page === 0}
            className="text-xs text-muted disabled:opacity-40"
            onClick={() => setPage((p) => p - 1)}
          >
            ← Préc.
          </button>
          <span className="text-xs text-muted">
            {page + 1} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages - 1}
            className="text-xs text-muted disabled:opacity-40"
            onClick={() => setPage((p) => p + 1)}
          >
            Suiv. →
          </button>
        </div>
      </StatsChartCard>
    </div>
  );
}
