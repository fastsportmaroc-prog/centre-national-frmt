"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, AlertTriangle, Bell, CheckCheck, Info } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { formatNotificationWhen } from "@/lib/v2/format-display-date";
import {
  fetchAlerts,
  markAlertRead,
  markAllAlertsRead,
  runAlertsEngine,
  type AlertSeverity,
  type AppAlert,
} from "@/lib/alerts/alertsEngine";
import { subscribeToAlerts } from "@/lib/realtime/notifications";

const SEVERITY_META: Record<
  AlertSeverity,
  { label: string; Icon: LucideIcon; border: string; bg: string; badge: string; title: string }
> = {
  danger: {
    label: "Urgent",
    Icon: AlertCircle,
    border: "border-l-red-500 border-red-500/35",
    bg: "bg-gradient-to-r from-red-950/50 to-transparent",
    badge: "bg-red-500/25 text-red-200 ring-1 ring-red-500/40",
    title: "text-red-100",
  },
  warning: {
    label: "Attention",
    Icon: AlertTriangle,
    border: "border-l-orange-500 border-orange-500/35",
    bg: "bg-gradient-to-r from-orange-950/45 to-transparent",
    badge: "bg-orange-500/25 text-orange-200 ring-1 ring-orange-500/40",
    title: "text-orange-100",
  },
  info: {
    label: "Info",
    Icon: Info,
    border: "border-l-sky-500 border-sky-500/30",
    bg: "bg-gradient-to-r from-sky-950/40 to-transparent",
    badge: "bg-sky-500/20 text-sky-200 ring-1 ring-sky-500/35",
    title: "text-sky-100",
  },
};

function AlertItem({
  alert,
  onRead,
}: {
  alert: AppAlert;
  onRead: (a: AppAlert) => void;
}) {
  const meta = SEVERITY_META[alert.severity];
  const { Icon } = meta;
  const when = formatNotificationWhen(alert.created_at);

  const body = (
    <div
      className={cn(
        "rounded-lg border border-l-4 p-3 transition",
        meta.border,
        meta.bg,
        !alert.lu && "ring-1 ring-white/5"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
            meta.badge
          )}
        >
          <Icon className="h-3 w-3" />
          {meta.label}
        </span>
        {!alert.lu && (
          <span className="h-2 w-2 shrink-0 rounded-full bg-frmt-green shadow-[0_0_6px_rgba(45,212,191,0.8)]" title="Non lu" />
        )}
      </div>
      <p className={cn("mt-2 text-sm font-semibold leading-snug", meta.title)}>{alert.title}</p>
      <p className="mt-1 text-xs leading-relaxed text-[#c9d1d9]/90">{alert.message}</p>
      <div className="mt-2 flex items-center justify-between gap-2 border-t border-white/5 pt-2">
        <time className="text-[11px] font-medium text-[#8b949e]" dateTime={alert.created_at} title={when.full}>
          <span className="text-[#e6edf3]">{when.relative}</span>
          <span className="mx-1 text-[#484f58]">·</span>
          <span className="font-mono tabular-nums">{when.time}</span>
        </time>
      </div>
    </div>
  );

  if (alert.href) {
    return (
      <Link href={alert.href} onClick={() => onRead(alert)} className="block px-3 py-2 hover:brightness-105">
        {body}
      </Link>
    );
  }

  return (
    <button type="button" className="block w-full px-3 py-2 text-left hover:brightness-105" onClick={() => onRead(alert)}>
      {body}
    </button>
  );
}

export function NotificationBell({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [alerts, setAlerts] = useState<AppAlert[]>([]);

  const refresh = useCallback(async () => {
    setAlerts(await fetchAlerts());
  }, []);

  useEffect(() => {
    void refresh();
    const unsub = subscribeToAlerts(() => {
      void refresh();
    });
    return () => {
      unsub();
    };
  }, [refresh]);

  useEffect(() => {
    if (!open) return;
    void runAlertsEngine().then(() => refresh());
    const interval = setInterval(() => {
      void runAlertsEngine().then(() => refresh());
    }, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, [open, refresh]);

  const unread = alerts.filter((a) => !a.lu);
  const urgentUnread = unread.filter((a) => a.severity === "danger").length;

  async function onClickAlert(a: AppAlert) {
    await markAlertRead(a.id);
    setOpen(false);
    void refresh();
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          compact
            ? "v2-topbar-icon-btn relative"
            : "relative flex items-center gap-2 rounded-lg border px-2.5 py-2 transition",
          !compact &&
            (open
              ? "border-frmt-gold/50 bg-frmt-gold/10 text-frmt-gold"
              : "border-[#30363d] bg-[#161b22] text-[#e6edf3] hover:border-frmt-gold/40 hover:bg-[#21262d]")
        )}
        aria-label={`Notifications${unread.length ? `, ${unread.length} non lues` : ""}`}
        aria-expanded={open}
      >
        <Bell className={cn("shrink-0", compact ? "h-4 w-4" : "h-4 w-4")} />
        {!compact && <span className="hidden text-xs font-medium sm:inline">Alertes</span>}
        {unread.length > 0 && (
          <span
            className={cn(
              compact
                ? "v2-topbar-badge"
                : "flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold text-white",
              !compact && (urgentUnread > 0 ? "bg-red-600" : "bg-amber-500 text-[#0d1117]")
            )}
          >
            {unread.length > 9 ? "9+" : unread.length}
          </span>
        )}
      </button>

      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px]"
            aria-label="Fermer les notifications"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 z-50 mt-2 w-[min(100vw-1rem,24rem)] overflow-hidden rounded-xl border border-[#30363d] bg-[#161b22] shadow-2xl shadow-black/50 sm:w-96">
            <div className="border-b border-[#30363d] bg-[#0d1117] px-4 py-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-bold text-[#e6edf3]">Centre d&apos;alertes</p>
                  <p className="mt-0.5 text-xs text-[#8b949e]">
                    {unread.length > 0
                      ? `${unread.length} notification${unread.length > 1 ? "s" : ""} non lue${unread.length > 1 ? "s" : ""}`
                      : "Tout est à jour"}
                  </p>
                </div>
                {alerts.length > 0 && (
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-md border border-[#30363d] px-2 py-1 text-[11px] text-frmt-green hover:bg-[#21262d]"
                    onClick={() => void markAllAlertsRead().then(refresh)}
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                    Tout marquer lu
                  </button>
                )}
              </div>
              {unread.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2 text-[10px]">
                  {(["danger", "warning", "info"] as const).map((sev) => {
                    const n = unread.filter((a) => a.severity === sev).length;
                    if (!n) return null;
                    const m = SEVERITY_META[sev];
                    return (
                      <span key={sev} className={cn("rounded-full px-2 py-0.5 font-semibold uppercase", m.badge)}>
                        {m.label} · {n}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="max-h-[min(70vh,22rem)] overflow-y-auto">
              {alerts.length === 0 ? (
                <p className="p-6 text-center text-sm text-[#8b949e]">Aucune alerte pour le moment.</p>
              ) : (
                <div className="divide-y divide-[#30363d]/60 py-1">
                  {alerts.slice(0, 15).map((a) => (
                    <AlertItem key={a.id} alert={a} onRead={onClickAlert} />
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-[#30363d] bg-[#0d1117] p-3 text-center">
              <Link
                href="/v2/dashboard"
                className="text-xs font-medium text-frmt-green hover:underline"
                onClick={() => setOpen(false)}
              >
                Ouvrir le tableau de bord →
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
