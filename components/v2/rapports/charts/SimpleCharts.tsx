"use client";

type BarItem = { label: string; value: number; color?: string };

const DEFAULT_COLORS = ["#006233", "#C9A227", "#C1272D", "#1a5c2a", "#4a6741"];

export function SimpleBarChart({
  items,
  maxValue,
  formatValue = (v) => String(v),
}: {
  items: BarItem[];
  maxValue?: number;
  formatValue?: (v: number) => string;
}) {
  const max = maxValue ?? Math.max(...items.map((i) => i.value), 1);

  return (
    <div className="space-y-2">
      {items.map((item, i) => {
        const pct = Math.round((item.value / max) * 100);
        const color = item.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length];
        return (
          <div key={item.label} className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-[var(--text-secondary)]">{item.label}</span>
              <span className="font-medium">{formatValue(item.value)}</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-[var(--bg-muted)]">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, backgroundColor: color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

type PieItem = { label: string; value: number; color?: string };

export function SimplePieChart({ items }: { items: PieItem[] }) {
  const total = items.reduce((s, i) => s + i.value, 0) || 1;
  let cumulative = 0;
  const gradientStops = items.map((item, i) => {
    const pct = (item.value / total) * 100;
    const start = cumulative;
    cumulative += pct;
    const color = item.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length];
    return `${color} ${start}% ${cumulative}%`;
  });

  return (
    <div className="flex flex-wrap items-center gap-6">
      <div
        className="h-32 w-32 shrink-0 rounded-full shadow-inner"
        style={{ background: `conic-gradient(${gradientStops.join(", ")})` }}
        role="img"
        aria-label="Graphique répartition"
      />
      <ul className="space-y-1.5 text-sm">
        {items.map((item, i) => {
          const color = item.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length];
          const pct = Math.round((item.value / total) * 100);
          return (
            <li key={item.label} className="flex items-center gap-2">
              <span
                className="inline-block h-3 w-3 rounded-sm"
                style={{ backgroundColor: color }}
              />
              <span className="text-[var(--text-secondary)]">{item.label}</span>
              <span className="font-medium">{pct}%</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function SimpleKpiGrid({
  items,
}: {
  items: { label: string; value: string; sub?: string }[];
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map((k) => (
        <div
          key={k.label}
          className="rounded-lg border border-frmt-gold/20 bg-[var(--bg-card)] p-3 text-center"
        >
          <p className="text-xs uppercase tracking-wide text-muted">{k.label}</p>
          <p className="mt-1 text-lg font-bold text-frmt-gold">{k.value}</p>
          {k.sub && <p className="text-xs text-[var(--text-secondary)]">{k.sub}</p>}
        </div>
      ))}
    </div>
  );
}
