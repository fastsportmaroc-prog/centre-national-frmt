"use client";

type Slice = { label: string; value: number; color?: string };

const COLORS = ["#38a169", "#e53e3e", "#8B6914", "#3182ce", "#805ad5"];

export function CategoriesPieChart({ data }: { data: Slice[] }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  let acc = 0;
  const gradient = data
    .map((d, i) => {
      const pct = (d.value / total) * 100;
      const start = acc;
      acc += pct;
      return `${d.color ?? COLORS[i % COLORS.length]} ${start}% ${acc}%`;
    })
    .join(", ");

  return (
    <div className="flex flex-wrap items-center gap-4">
      <div
        className="h-28 w-28 shrink-0 rounded-full border border-[#2a2d3a]"
        style={{ background: `conic-gradient(${gradient})` }}
      />
      <ul className="space-y-1 text-xs text-[var(--text-secondary)]">
        {data.map((d, i) => (
          <li key={d.label} className="flex items-center gap-2">
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{ background: d.color ?? COLORS[i % COLORS.length] }}
            />
            {d.label} — {d.value} ({Math.round((d.value / total) * 100)}%)
          </li>
        ))}
      </ul>
    </div>
  );
}
