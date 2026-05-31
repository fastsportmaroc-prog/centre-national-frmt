import type { DashboardAlertLevel } from "@/lib/v2/dashboard-data";
import type {
  PasseportAlerteNiveau,
  VisaStatutAffiche,
} from "@/lib/competitions/passeport-competition";
import type { CompetitionVisaUrgentRow } from "@/lib/competitions/dashboard-summary";

/** Styles des groupes d’alertes (tableau de bord logistique / technique). */
export const DASHBOARD_ALERT_LEVEL: Record<
  DashboardAlertLevel,
  {
    title: string;
    border: string;
    card: string;
    titleText: string;
    messageText: string;
    dot: string;
  }
> = {
  urgent: {
    title: "Urgent",
    dot: "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]",
    border: "border-l-red-500",
    card: "border-red-500/35 bg-gradient-to-r from-red-950/50 via-red-950/20 to-transparent hover:border-red-400/50",
    titleText: "text-red-300",
    messageText: "text-red-50/95",
  },
  attention: {
    title: "Attention",
    dot: "bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]",
    border: "border-l-orange-500",
    card: "border-orange-500/35 bg-gradient-to-r from-orange-950/45 via-orange-950/15 to-transparent hover:border-orange-400/50",
    titleText: "text-orange-300",
    messageText: "text-orange-50/95",
  },
  info: {
    title: "Information",
    dot: "bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.45)]",
    border: "border-l-sky-500",
    card: "border-sky-500/30 bg-gradient-to-r from-sky-950/40 via-sky-950/10 to-transparent hover:border-sky-400/45",
    titleText: "text-sky-300",
    messageText: "text-sky-50/90",
  },
};

export type KpiAccent = "navy" | "green" | "gold" | "warning" | "danger" | "info" | "neutral";

export const KPI_ACCENT: Record<
  KpiAccent,
  { border: string; icon: string; value: string; bg: string }
> = {
  navy: {
    border: "border-t-[#2563eb]",
    icon: "text-blue-400",
    value: "text-[#e6edf3]",
    bg: "hover:bg-blue-950/20",
  },
  green: {
    border: "border-t-frmt-green",
    icon: "text-frmt-green",
    value: "text-[#e6edf3]",
    bg: "hover:bg-emerald-950/25",
  },
  gold: {
    border: "border-t-frmt-gold",
    icon: "text-frmt-gold",
    value: "text-frmt-gold",
    bg: "hover:bg-amber-950/20",
  },
  warning: {
    border: "border-t-amber-500",
    icon: "text-amber-400",
    value: "text-amber-100",
    bg: "hover:bg-amber-950/25",
  },
  danger: {
    border: "border-t-red-500",
    icon: "text-red-400",
    value: "text-red-200",
    bg: "hover:bg-red-950/25",
  },
  info: {
    border: "border-t-violet-500",
    icon: "text-violet-400",
    value: "text-violet-100",
    bg: "hover:bg-violet-950/25",
  },
  neutral: {
    border: "border-t-[#484f58]",
    icon: "text-[#8b949e]",
    value: "text-[#e6edf3]",
    bg: "hover:bg-[#21262d]",
  },
};

export function passeportAlerteBadgeClass(niveau: PasseportAlerteNiveau): string {
  switch (niveau) {
    case "valide":
      return "border border-emerald-500/45 bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/20";
    case "attention":
      return "border border-amber-500/45 bg-amber-500/15 text-amber-200 ring-1 ring-amber-500/20";
    case "expire":
      return "border border-red-500/50 bg-red-500/20 text-red-200 ring-1 ring-red-500/25";
    default:
      return "border border-slate-500/45 bg-slate-500/15 text-slate-300 ring-1 ring-slate-500/20";
  }
}

export function visaStatutBadgeClass(statut: VisaStatutAffiche): string {
  switch (statut) {
    case "obtenu":
      return "border border-emerald-500/45 bg-emerald-500/15 text-emerald-300";
    case "non_requis":
      return "border border-slate-500/40 bg-slate-600/25 text-slate-300";
    case "en_cours":
      return "border border-sky-500/45 bg-sky-500/15 text-sky-200";
    case "refuse":
      return "border border-red-500/50 bg-red-500/25 text-red-200";
    default:
      return "border border-orange-500/45 bg-orange-500/15 text-orange-200";
  }
}

/** Bordure gauche + fond léger pour une ligne du tableau visas compétition. */
export function competitionAlertRowClass(row: CompetitionVisaUrgentRow): string {
  if (row.visa_statut === "refuse" || row.passeport_alerte === "expire") {
    return "border-l-[3px] border-l-red-500 bg-red-950/20";
  }
  if (row.visa_statut === "inconnu" || row.passeport_alerte === "inconnu") {
    return "border-l-[3px] border-l-orange-500 bg-orange-950/15";
  }
  if (row.visa_statut === "en_cours" || row.passeport_alerte === "attention") {
    return "border-l-[3px] border-l-amber-500 bg-amber-950/10";
  }
  return "border-l-[3px] border-l-emerald-500/50 bg-emerald-950/5";
}

export type CompetitionCardUrgency = "critical" | "warning" | "ok" | "neutral";

export function competitionCardUrgency(c: {
  visas_a_prevoir: number;
  passeports_alerte: number;
  billets_en_attente: number;
  pret_logistique_pct: number;
}): CompetitionCardUrgency {
  if (c.visas_a_prevoir > 0 || c.passeports_alerte > 0) return "critical";
  if (c.billets_en_attente > 0 || c.pret_logistique_pct < 50) return "warning";
  if (c.pret_logistique_pct >= 75) return "ok";
  return "neutral";
}

export const COMPETITION_CARD_URGENCY: Record<
  CompetitionCardUrgency,
  { ring: string; borderL: string; outer: string }
> = {
  critical: {
    ring: "ring-1 ring-red-500/35",
    borderL: "border-l-red-500",
    outer: "hover:border-red-400/40",
  },
  warning: {
    ring: "ring-1 ring-amber-500/30",
    borderL: "border-l-amber-500",
    outer: "hover:border-amber-400/40",
  },
  ok: {
    ring: "ring-1 ring-emerald-500/25",
    borderL: "border-l-emerald-500",
    outer: "hover:border-emerald-400/35",
  },
  neutral: {
    ring: "",
    borderL: "border-l-[#30363d]",
    outer: "hover:border-frmt-gold/50",
  },
};

export const PASSPORT_STAT_ROWS = [
  {
    key: "passeportsExpires",
    label: "Passeports expirés",
    border: "border-red-500/40",
    bg: "bg-red-950/35",
    labelText: "text-red-200/80",
    valueTone: "text-red-300",
    dot: "bg-red-500",
  },
  {
    key: "passeportsExpiring6Months",
    label: "Passeports à renouveler (< 6 mois)",
    border: "border-amber-500/40",
    bg: "bg-amber-950/30",
    labelText: "text-amber-200/80",
    valueTone: "text-amber-300",
    dot: "bg-amber-500",
  },
  {
    key: "visasExpires",
    label: "Visas expirés",
    border: "border-rose-500/40",
    bg: "bg-rose-950/30",
    labelText: "text-rose-200/80",
    valueTone: "text-rose-300",
    dot: "bg-rose-500",
  },
  {
    key: "visasExpiring30Days",
    label: "Visas urgents (< 30 jours)",
    border: "border-orange-500/40",
    bg: "bg-orange-950/30",
    labelText: "text-orange-200/80",
    valueTone: "text-orange-300",
    dot: "bg-orange-500",
  },
] as const;
