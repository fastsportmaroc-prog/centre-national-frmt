"use client";

import Link from "next/link";
import { AlertCircle, AlertTriangle, Info } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { DASHBOARD_ALERT_LEVEL } from "@/lib/v2/dashboard-colors";
import type { DashboardAlert, DashboardAlertLevel } from "@/lib/v2/dashboard-data";

const LEVEL_ICON: Record<DashboardAlertLevel, LucideIcon> = {
  urgent: AlertCircle,
  attention: AlertTriangle,
  info: Info,
};

function AlertGroup({ level, items }: { level: DashboardAlertLevel; items: DashboardAlert[] }) {
  if (!items.length) return null;
  const meta = DASHBOARD_ALERT_LEVEL[level];
  const Icon = LEVEL_ICON[level];

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className={cn("h-2 w-2 shrink-0 rounded-full", meta.dot)} aria-hidden />
        <Icon className={cn("h-4 w-4", meta.titleText)} />
        <p className={cn("text-xs font-bold uppercase tracking-wide", meta.titleText)}>
          {meta.title} ({items.length})
        </p>
      </div>
      <ul className="space-y-2">
        {items.map((a, i) => {
          const inner = (
            <>
              <span className={cn("font-medium", meta.messageText)}>{a.message}</span>
            </>
          );
          const className = cn(
            "block rounded-lg border border-l-4 px-3 py-2.5 text-sm transition",
            meta.border,
            meta.card
          );
          return (
            <li key={`${level}-${i}`}>
              {a.href ? (
                <Link href={a.href} className={cn(className, "hover:brightness-110")}>
                  {inner}
                </Link>
              ) : (
                <div className={className}>{inner}</div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function DashboardAlertsPanel({
  byLevel,
}: {
  byLevel: Record<DashboardAlertLevel, DashboardAlert[]>;
}) {
  const total =
    byLevel.urgent.length + byLevel.attention.length + byLevel.info.length;
  if (!total) {
    return (
      <p className="rounded-lg border border-emerald-500/30 bg-emerald-950/20 px-4 py-3 text-sm text-emerald-300">
        Aucune alerte active — tout est sous contrôle.
      </p>
    );
  }
  return (
    <div className="space-y-5">
      <AlertGroup level="urgent" items={byLevel.urgent} />
      <AlertGroup level="attention" items={byLevel.attention} />
      <AlertGroup level="info" items={byLevel.info} />
    </div>
  );
}
