"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { KpiAccent } from "@/lib/v2/dashboard-colors";

type Props = {
  label: string;
  value: string | number;
  sublabel?: string;
  href: string;
  icon: LucideIcon;
  accent?: KpiAccent;
  pulse?: boolean;
};

const ACCENT_VARIANT: Record<KpiAccent, string> = {
  navy: "kpi-card--blue",
  green: "kpi-card--green",
  gold: "kpi-card--amber",
  warning: "kpi-card--amber",
  danger: "kpi-card--red",
  info: "kpi-card--purple",
  neutral: "kpi-card--teal",
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
  const variant = ACCENT_VARIANT[accent];
  const num = typeof value === "number" ? value : parseInt(String(value), 10);
  const showPulse = pulse && !Number.isNaN(num) && num > 0;

  return (
    <Link href={href} className="block">
      <div
        className={cn(
          "v2-kpi-card transition-colors hover:bg-[var(--bg-hover)]",
          variant,
          showPulse && accent === "danger" && "kpi-card--pulse-red",
          showPulse && accent === "warning" && "kpi-card--pulse-amber"
        )}
      >
        <div className="kpi-card-inner">
          <div className="kpi-card-top">
            <div>
              <p className="kpi-card-label">{label}</p>
              <p className="kpi-card-value mt-2">{value}</p>
            </div>
            <div className="kpi-card-icon">
              <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
            </div>
          </div>
          {sublabel && <p className="kpi-card-sublabel">{sublabel}</p>}
        </div>
      </div>
    </Link>
  );
}
