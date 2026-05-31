"use client";

import Link from "next/link";
import { formatDateMedium } from "@/lib/v2/format-display-date";
import { AlertTriangle, IdCard, Plane, Plus, Trophy, Users } from "lucide-react";
import { passeportAlerteLabel, visaStatutLabel } from "@/lib/competitions/passeport-competition";
import type { CompetitionDashboardSummary } from "@/lib/competitions/dashboard-summary";
import {
  competitionAlertRowClass,
  passeportAlerteBadgeClass,
  visaStatutBadgeClass,
} from "@/lib/v2/dashboard-colors";
import { KpiCard } from "./KpiCard";
import { CompetitionDashboardCard } from "./CompetitionDashboardCard";
import { cn } from "@/lib/utils/cn";

type Props = {
  data: CompetitionDashboardSummary;
};

export function DashboardCompetitionView({ data }: Props) {
  const { competitions, kpis, visasUrgents, error } = data;

  if (error) {
    return (
      <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-6 text-sm text-amber-100">
        <p className="font-medium">Module compétitions</p>
        <p className="mt-2 text-amber-200/90">{error}</p>
        <p className="mt-2 text-xs text-amber-200/70">
          Vérifiez la migration SQL compétitions dans Supabase, puis rechargez la page.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm text-[#8b949e]">
          Vue dédiée aux compétitions internationales : visas, passeports, participants et billets
          regroupés par événement.
        </p>
        <Link
          href="/competitions"
          className="inline-flex items-center gap-2 rounded-lg border border-frmt-gold/40 bg-frmt-navy/30 px-3 py-2 text-sm font-medium text-white hover:bg-frmt-navy/50"
        >
          <Plus className="h-4 w-4" />
          Nouvelle compétition
        </Link>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard
          label="Compétitions"
          sublabel="actives / à venir"
          value={kpis.actives}
          href="/competitions"
          icon={Trophy}
          accent="gold"
        />
        <KpiCard
          label="Avec visas"
          sublabel="suivi obligatoire"
          value={kpis.avec_visas}
          href="/competitions"
          icon={IdCard}
          accent="info"
        />
        <KpiCard
          label="Visas"
          sublabel="à prévoir / refus"
          value={kpis.visas_a_prevoir}
          href="/v2/passeports"
          icon={AlertTriangle}
          accent="danger"
          pulse
        />
        <KpiCard
          label="Passeports"
          sublabel="alerte ou manquant"
          value={kpis.passeports_critiques}
          href="/v2/passeports"
          icon={IdCard}
          accent="warning"
          pulse
        />
        <KpiCard
          label="Billets"
          sublabel="en attente"
          value={kpis.billets_en_attente}
          href="/competitions"
          icon={Plane}
          accent="navy"
          pulse
        />
        <KpiCard
          label="Participants"
          sublabel="toutes compétitions"
          value={kpis.participants_total}
          href="/competitions"
          icon={Users}
          accent="green"
        />
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-[0.08em] text-[#484f58]">
            Visas &amp; passeports à traiter
          </h2>
          <Link href="/v2/passeports" className="text-xs text-frmt-green hover:underline">
            Module passeports
          </Link>
        </div>
        <div className="overflow-hidden rounded-xl border border-[#30363d] bg-[#161b22]">
          {visasUrgents.length === 0 ? (
            <p className="border-l-4 border-l-emerald-500 bg-emerald-950/15 p-6 text-center text-sm text-emerald-300">
              Aucune alerte visa/passeport sur les compétitions avec suivi visa activé.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <div className="flex flex-wrap gap-3 border-b border-[#30363d] bg-[#0d1117]/50 px-3 py-2 text-[11px]">
                <span className="flex items-center gap-1.5 text-red-300">
                  <span className="h-2 w-2 rounded-full bg-red-500" /> Critique
                </span>
                <span className="flex items-center gap-1.5 text-orange-300">
                  <span className="h-2 w-2 rounded-full bg-orange-500" /> À traiter
                </span>
                <span className="flex items-center gap-1.5 text-amber-300">
                  <span className="h-2 w-2 rounded-full bg-amber-500" /> En cours
                </span>
              </div>
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-[#30363d] text-left text-xs uppercase tracking-wide text-[#6e7681]">
                    <th className="p-3">Compétition</th>
                    <th className="p-3">Participant</th>
                    <th className="p-3">Passeport</th>
                    <th className="p-3">Visa</th>
                    <th className="p-3" />
                  </tr>
                </thead>
                <tbody>
                  {visasUrgents.map((r) => (
                    <tr
                      key={`${r.competition_id}-${r.participant_type}-${r.participant_id}`}
                      className={cn(
                        "border-b border-[#30363d]/60 transition hover:brightness-110",
                        competitionAlertRowClass(r)
                      )}
                    >
                      <td className="p-3">
                        <p className="font-medium text-[#e6edf3]">{r.competition_nom}</p>
                        <p className="text-xs text-[#6e7681]">
                          Fin compétition · {formatDateMedium(r.date_fin)}
                        </p>
                      </td>
                      <td className="p-3 text-[#e6edf3]">
                        {r.prenom} {r.nom}
                        <span className="ml-1 text-xs text-[#6e7681]">({r.poste})</span>
                      </td>
                      <td className="p-3">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
                            passeportAlerteBadgeClass(r.passeport_alerte)
                          )}
                        >
                          {passeportAlerteLabel(r.passeport_alerte)}
                        </span>
                      </td>
                      <td className="p-3">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
                            visaStatutBadgeClass(r.visa_statut)
                          )}
                        >
                          {visaStatutLabel(r.visa_statut)}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <Link
                          href={`/competitions/${r.competition_id}`}
                          className="text-xs text-frmt-green hover:underline"
                        >
                          Fiche →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-[0.08em] text-[#484f58]">
            Compétitions — tableau de bord
          </h2>
          <Link href="/competitions" className="text-xs text-frmt-green hover:underline">
            Toutes les compétitions
          </Link>
        </div>
        {competitions.length === 0 ? (
          <div className="v2-kpi-card p-10 text-center">
            <Trophy className="mx-auto h-10 w-10 text-[#484f58]" />
            <p className="mt-3 font-medium text-[#e6edf3]">Aucune compétition planifiée</p>
            <p className="mt-1 text-sm text-[#8b949e]">
              Créez une compétition et activez le suivi visa si nécessaire.
            </p>
            <Link
              href="/competitions"
              className="mt-4 inline-block text-sm text-frmt-green hover:underline"
            >
              Créer une compétition
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {competitions.map((c) => (
              <CompetitionDashboardCard key={c.id} competition={c} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
