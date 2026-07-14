"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils/cn";
import { STATS_CHART, rechartsMargin } from "@/components/v2/statistiques/chart-theme";
import {
  rangeForEvolutionPreset,
  type EvolutionPeriodPreset,
} from "@/lib/classements-maroc-scrapes/evolution-period";
import type {
  ClassementMarocDiscipline,
  ClassementMarocEvolutionResult,
} from "@/lib/types/classements-maroc-scrapes";

const COLORS = [
  STATS_CHART.frmtGreen,
  STATS_CHART.frmtRed,
  STATS_CHART.frmtGold,
  STATS_CHART.frmtBlue,
  "#a855f7",
];

const PRESETS: { value: EvolutionPeriodPreset; label: string }[] = [
  { value: "mois", label: "Mois" },
  { value: "trimestre", label: "Trimestre" },
  { value: "semestre", label: "Semestre" },
  { value: "custom", label: "Personnalisé" },
];

type PlayerOption = {
  key: string;
  nom_joueur: string;
  type_classement: string;
  rang: number;
};

type Props = {
  className?: string;
  /** Pré-sélection initiale (max 5). */
  initialKeys?: string[];
  compact?: boolean;
  discipline?: ClassementMarocDiscipline;
};

function fmtSemaine(iso: string): string {
  try {
    return format(parseISO(iso), "d MMM yy", { locale: fr });
  } catch {
    return iso;
  }
}

export function ClassementInternationalEvolutionChart({
  className,
  initialKeys,
  compact = false,
  discipline = "simple",
}: Props) {
  const [options, setOptions] = useState<PlayerOption[]>([]);
  const [selected, setSelected] = useState<string[]>(initialKeys ?? []);
  const [preset, setPreset] = useState<EvolutionPeriodPreset>("semestre");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [metric, setMetric] = useState<"rang" | "points">("rang");
  const [data, setData] = useState<ClassementMarocEvolutionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch(
          `/api/dashboard/classements-maroc-scrapes/evolution?meta=players&discipline=${discipline}`,
          { cache: "no-store" }
        );
        const json = (await res.json()) as { players?: PlayerOption[] };
        const list = json.players ?? [];
        setOptions(list);
        setSelected((prev) => {
          if (prev.length) return prev.filter((k) => list.some((p) => p.key === k)).slice(0, 5);
          return list.slice(0, Math.min(3, list.length)).map((p) => p.key);
        });
      } catch {
        setOptions([]);
        setSelected([]);
      }
    })();
  }, [discipline]);

  const range = useMemo(
    () => rangeForEvolutionPreset(preset, { from: customFrom, to: customTo }),
    [preset, customFrom, customTo]
  );

  const load = useCallback(async () => {
    if (!selected.length) {
      setData(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        from: range.from,
        to: range.to,
        keys: selected.join(","),
        metric,
      });
      const res = await fetch(
        `/api/dashboard/classements-maroc-scrapes/evolution?${params}`,
        { cache: "no-store" }
      );
      const json = (await res.json()) as ClassementMarocEvolutionResult & { error?: string };
      if (json.error && !json.players?.length) setError(json.error);
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur chargement");
    } finally {
      setLoading(false);
    }
  }, [selected, range.from, range.to, metric]);

  useEffect(() => {
    void load();
  }, [load]);

  const chartData = useMemo(() => {
    if (!data?.players.length) return [];
    const byDate = new Map<string, Record<string, number | string | null>>();
    for (const p of data.players) {
      for (const pt of p.series) {
        const row = byDate.get(pt.semaine_releve) ?? { semaine: pt.semaine_releve };
        const value = metric === "points" ? pt.points : pt.rang;
        row[p.key] = value;
        byDate.set(pt.semaine_releve, row);
      }
    }
    return [...byDate.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([, row]) => row);
  }, [data, metric]);

  function toggleKey(key: string) {
    setSelected((prev) => {
      if (prev.includes(key)) return prev.filter((k) => k !== key);
      if (prev.length >= 5) return prev;
      return [...prev, key];
    });
  }

  return (
    <div
      className={cn(
        "rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] p-4",
        className
      )}
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="dashboard-section-label text-[var(--text-primary)]">
            Évolution — Classement International
          </h3>
          <p className="mt-0.5 text-[10px] text-[var(--text-muted)]">
            {metric === "rang"
              ? "Axe rang : le haut du graphique = meilleur classement (rang plus bas)."
              : "Courbe des points ATP/WTA dans le temps."}
          </p>
        </div>
        <div className="flex rounded-lg border border-[var(--border-main)] p-0.5">
          {(["rang", "points"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMetric(m)}
              className={cn(
                "rounded-md px-2.5 py-1 text-[10px] font-medium capitalize",
                metric === m
                  ? "bg-[var(--frmt-green,#16a34a)] text-white"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              )}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => setPreset(p.value)}
            className={cn(
              "rounded-full px-2.5 py-1 text-[10px] font-medium",
              preset === p.value
                ? "bg-[var(--frmt-navy,#0f172a)] text-white"
                : "bg-[var(--surface-elevated)] text-[var(--text-muted)]"
            )}
          >
            {p.label}
          </button>
        ))}
        {preset === "custom" && (
          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="rounded border border-[var(--border-subtle)] bg-[var(--surface)] px-1.5 py-1"
            />
            <span className="text-[var(--text-muted)]">→</span>
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="rounded border border-[var(--border-subtle)] bg-[var(--surface)] px-1.5 py-1"
            />
          </div>
        )}
      </div>

      {!compact && options.length > 0 && (
        <div className="mb-3 flex max-h-24 flex-wrap gap-1.5 overflow-y-auto">
          {options.map((p, i) => {
            const on = selected.includes(p.key);
            return (
              <button
                key={p.key}
                type="button"
                onClick={() => toggleKey(p.key)}
                className={cn(
                  "rounded-full border px-2 py-0.5 text-[10px] font-medium transition",
                  on
                    ? "border-transparent text-white"
                    : "border-[var(--border-subtle)] text-[var(--text-muted)] hover:border-[var(--frmt-green,#16a34a)]"
                )}
                style={on ? { backgroundColor: COLORS[selected.indexOf(p.key) % COLORS.length] } : undefined}
                title={`#${p.rang} ${p.type_classement}`}
              >
                {p.nom_joueur}
              </button>
            );
          })}
        </div>
      )}

      {compact && options.length > 0 && (
        <div className="mb-3">
          <select
            multiple
            value={selected}
            onChange={(e) => {
              const vals = [...e.target.selectedOptions].map((o) => o.value).slice(0, 5);
              setSelected(vals);
            }}
            className="w-full max-w-md rounded-lg border border-[var(--border-subtle)] bg-[var(--surface)] px-2 py-1 text-[11px]"
            size={Math.min(5, options.length)}
          >
            {options.map((p) => (
              <option key={p.key} value={p.key}>
                #{p.rang} {p.nom_joueur} ({p.type_classement})
              </option>
            ))}
          </select>
          <p className="mt-1 text-[9px] text-[var(--text-muted)]">
            Ctrl/Cmd + clic pour comparer jusqu’à 5 joueurs.
          </p>
        </div>
      )}

      {error && (
        <p className="mb-2 text-[11px] text-amber-700">{error}</p>
      )}
      {loading ? (
        <p className="py-10 text-center text-[12px] text-[var(--text-muted)]">Chargement…</p>
      ) : chartData.length === 0 ? (
        <p className="py-10 text-center text-[12px] text-[var(--text-muted)]">
          {discipline === "double"
            ? "Classements double : aucune donnée sur cette période."
            : selected.length === 0
              ? "Sélectionnez au moins un joueur CNE."
              : "Aucune donnée sur cette période."}
        </p>
      ) : (
        <div className={cn(compact ? "h-56" : "h-72")}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={rechartsMargin}>
              <CartesianGrid stroke={STATS_CHART.grid} strokeDasharray="3 3" />
              <XAxis
                dataKey="semaine"
                tickFormatter={fmtSemaine}
                stroke={STATS_CHART.axis}
                tick={{ fontSize: 10 }}
              />
              <YAxis
                stroke={STATS_CHART.axis}
                tick={{ fontSize: 10 }}
                reversed={metric === "rang"}
                domain={metric === "rang" ? ["dataMin - 20", "dataMax + 20"] : ["auto", "auto"]}
                label={{
                  value: metric === "rang" ? "Rang (↑ = mieux)" : "Points",
                  angle: -90,
                  position: "insideLeft",
                  style: { fontSize: 10, fill: STATS_CHART.axis },
                }}
              />
              <Tooltip
                contentStyle={{
                  background: STATS_CHART.tooltipBg,
                  border: `1px solid ${STATS_CHART.tooltipBorder}`,
                  borderRadius: 8,
                  fontSize: 11,
                }}
                labelFormatter={(label) => fmtSemaine(String(label))}
                formatter={(value: number | string, name: string) => {
                  const player = data?.players.find((p) => p.key === name);
                  const label = player?.nom_joueur ?? name;
                  if (metric === "rang") return [`#${value}`, label];
                  return [value, label];
                }}
              />
              <Legend
                formatter={(value) => {
                  const player = data?.players.find((p) => p.key === value);
                  return player?.nom_joueur ?? value;
                }}
                wrapperStyle={{ fontSize: 11 }}
              />
              {data?.players.map((p, i) => (
                <Line
                  key={p.key}
                  type="monotone"
                  dataKey={p.key}
                  name={p.key}
                  stroke={COLORS[i % COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
