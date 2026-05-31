"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import {
  getDashboardStageBundle,
  type DashboardAlerte,
  type DashboardStageCard,
  type StageStatutVisuel,
} from "@/lib/data/dashboard-stages";
import { formatDate } from "@/lib/utils/dates";
import { AlertTriangle, CalendarDays, MapPin, Plus, Trophy, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const STATUT_STYLE: Record<
  StageStatutVisuel,
  { label: string; className: string }
> = {
  prevu: { label: "Prévu", className: "bg-zinc-500/20 text-zinc-300 border-zinc-500/40" },
  confirme: { label: "Confirmé", className: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" },
  imminent: { label: "< 7 jours", className: "bg-amber-500/20 text-amber-300 border-amber-500/40" },
  annule: { label: "Annulé", className: "bg-red-500/20 text-red-300 border-red-500/40" },
};

function BoolBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`text-xs ${ok ? "text-emerald-400" : "text-red-400"}`}>
      {label} {ok ? "✓" : "✗"}
    </span>
  );
}

function StageCardBadges({ card }: { card: DashboardStageCard }) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
      <span>Joueurs {card.joueurs}</span>
      <span>|</span>
      <span>Coachs {card.coachs}</span>
      <span>|</span>
      <BoolBadge ok={card.hebergement} label="Hébergement" />
      <span>|</span>
      <BoolBadge ok={card.restauration} label="Restauration" />
      <span>|</span>
      <BoolBadge ok={card.terrains} label="Terrains" />
    </div>
  );
}

function StageCard({ card }: { card: DashboardStageCard }) {
  const st = STATUT_STYLE[card.statutVisuel];
  return (
    <Link href={`/stages/${card.stage.id}`}>
      <Card className="premium p-4 transition hover:border-frmt-green/40 hover:bg-frmt-green/5">
        <StageCardHeader card={card} st={st} />
        <StageCardBadges card={card} />
      </Card>
    </Link>
  );
}

function StageCardHeader({
  card,
  st,
}: {
  card: DashboardStageCard;
  st: (typeof STATUT_STYLE)[StageStatutVisuel];
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div>
        <h3 className="font-semibold">{card.stage.stage_action}</h3>
        <p className="text-sm text-muted mt-0.5">
          {formatDate(card.stage.date_debut)} → {formatDate(card.stage.date_fin)} ·{" "}
          {card.stage.categorie}
        </p>
      </div>
      <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${st.className}`}>
        {st.label}
      </span>
    </div>
  );
}

function KpiCard({
  label,
  value,
  href,
  icon: Icon,
}: {
  label: string;
  value: number | string;
  href: string;
  icon: LucideIcon;
}) {
  return (
    <Link href={href}>
      <Card className="premium p-4 transition hover:border-frmt-green/40 hover:bg-frmt-green/5">
        <div className="flex items-center gap-2 text-muted mb-1">
          <Icon className="h-4 w-4" />
          <span className="text-xs">{label}</span>
        </div>
        <p className="text-2xl font-bold text-frmt-green">{value}</p>
      </Card>
    </Link>
  );
}

function AlerteRow({ a }: { a: DashboardAlerte }) {
  return (
    <Link
      href={a.href}
      className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm transition hover:bg-white/5 ${
        a.level === "error"
          ? "border-red-500/40 bg-red-500/10 text-red-200"
          : "border-amber-500/40 bg-amber-500/10 text-amber-200"
      }`}
    >
      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
      <div>
        <p>{a.message}</p>
        <p className="text-xs opacity-70 mt-0.5">{a.stage_label}</p>
      </div>
    </Link>
  );
}

export function DashboardStagesSection() {
  const [bundle, setBundle] = useState<Awaited<
    ReturnType<typeof getDashboardStageBundle>
  > | null>(null);

  useEffect(() => {
    getDashboardStageBundle().then(setBundle);
  }, []);

  if (!bundle) {
    return (
      <Card className="p-6 text-sm text-muted">Chargement du tableau de bord stages…</Card>
    );
  }

  return (
    <section className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-frmt-green" />
            Stages à venir
          </h2>
          <Link
            href="/stages/nouveau"
            className="text-sm text-frmt-green hover:underline flex items-center gap-1"
          >
            <Plus className="h-4 w-4" />
            Créer un stage
          </Link>
        </div>
        {bundle.stagesAvenir.length === 0 ? (
          <Card className="p-6 text-center text-muted">
            <p>Aucun stage prévu — créer un stage</p>
            <Link href="/stages/nouveau" className="mt-2 inline-block text-frmt-green hover:underline">
              Nouveau stage →
            </Link>
          </Card>
        ) : (
          <div className="grid gap-3">
            {bundle.stagesAvenir.map((card) => (
              <StageCard key={card.stage.id} card={card} />
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Trophy className="h-5 w-5 text-frmt-green" />
          Chiffres clés du centre
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Stages à venir"
            value={bundle.kpis.stagesAvenir}
            href="/stages"
            icon={CalendarDays}
          />
          <KpiCard
            label="Joueurs actifs concernés"
            value={bundle.kpis.joueursActifsConcernes}
            href="/joueurs"
            icon={Users}
          />
          <KpiCard
            label="Courts utilisés cette semaine"
            value={bundle.kpis.courtsUtilisesSemaine}
            href="/infrastructures"
            icon={MapPin}
          />
          <KpiCard
            label="Alertes actives"
            value={bundle.kpis.alertesActives}
            href="#alertes"
            icon={AlertTriangle}
          />
        </div>
      </div>

      <div id="alertes">
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-400" />
          Alertes
        </h2>
        {bundle.alertes.length === 0 ? (
          <Card className="p-4 text-sm text-muted">Aucune alerte active.</Card>
        ) : (
          <div className="space-y-2">
            {bundle.alertes.map((a) => (
              <AlerteRow key={a.id} a={a} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
