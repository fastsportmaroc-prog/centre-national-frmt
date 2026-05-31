"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { KPI_ACCENT, type KpiAccent } from "@/lib/v2/dashboard-colors";

type Props = {
  label: string;
  value: string | number;
  sublabel?: string;
  href: string;
  icon: LucideIcon;
  accent?: KpiAccent;
  /** Met en avant la valeur si &gt; 0 (danger / warning). */
  pulse?: boolean;
};

export function KpiCard({
  label,
  value,
  sublabel,
  href,
  icon: Icon,
  accent = "navy",
  pulse = false,
}: Props) {
  const style = KPI_ACCENT[accent];
  const num = typeof value === "number" ? value : parseInt(String(value), 10);
  const showPulse = pulse && !Number.isNaN(num) && num > 0;

  return (
    <Link href={href} className="block">
      <div
        className={cn(
          "v2-kpi-card border-t-[3px] p-4 transition",
          style.border,
          style.bg,
          "hover:border-frmt-gold/30",
          showPulse && accent === "danger" && "shadow-[0_0_20px_rgba(239,68,68,0.12)]",
          showPulse && accent === "warning" && "shadow-[0_0_20px_rgba(245,158,11,0.1)]"
        )}
      >
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs text-[#8b949e]">{label}</span>
          <Icon className={cn("h-4 w-4", style.icon)} />
        </div>
        <p className={cn("text-[32px] font-bold leading-none tabular-nums", style.value)}>
          {value}
        </p>
        {sublabel && <p className="mt-1 text-xs text-[#6e7681]">{sublabel}</p>}
      </div>
    </Link>
  );
}
