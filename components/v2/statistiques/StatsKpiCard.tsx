"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type Props = {
  label: string;
  value: string | number;
  sub?: string;
  icon?: LucideIcon;
  progress?: number;
  className?: string;
};

export function StatsKpiCard({ label, value, sub, icon: Icon, progress, className }: Props) {
  return (
    <div
      className={cn(
        "rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 shadow-sm",
        className
      )}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs uppercase tracking-wide text-muted">{label}</span>
        {Icon && <Icon className="h-4 w-4 text-frmt-gold" />}
      </div>
      <p className="text-2xl font-bold tabular-nums text-frmt-gold">{value}</p>
      {sub && <p className="mt-1 text-xs text-muted">{sub}</p>}
      {progress != null && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--bg-muted)]">
          <div
            className="h-full rounded-full bg-frmt-green transition-all"
            style={{ width: `${Math.min(100, progress)}%` }}
          />
        </div>
      )}
    </div>
  );
}

export function StatsKpiRow({
  items,
}: {
  items: {
    label: string;
    value: string | number;
    sub?: string;
    progress?: number;
  }[];
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {items.map((k) => (
        <StatsKpiCard key={k.label} {...k} />
      ))}
    </div>
  );
}

export function StatsChartCard({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-4",
        className
      )}
    >
      <h3 className="mb-4 text-sm font-semibold text-foreground">{title}</h3>
      {children}
    </div>
  );
}
