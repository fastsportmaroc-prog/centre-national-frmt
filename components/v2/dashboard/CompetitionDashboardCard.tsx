"use client";

import Link from "next/link";
import { ArrowRight, Calendar, IdCard, Plane, Users } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { formatDateRangeShort } from "@/lib/v2/format-display-date";
import {
  COMPETITION_CARD_URGENCY,
  competitionCardUrgency,
} from "@/lib/v2/dashboard-colors";
import { statutCompetitionLabel, visasRequisLabel } from "@/lib/competitions/utils";
import type { CompetitionDashboardCard as CompetitionCard } from "@/lib/competitions/dashboard-summary";

function statutClass(statut: string) {
  switch (statut) {
    case "en_cours":
      return "border-emerald-500/50 bg-emerald-500/15 text-emerald-300";
    case "a_venir":
      return "border-sky-500/45 bg-sky-500/12 text-sky-200";
    case "terminee":
      return "border-[#30363d] bg-[#1c2330] text-[#6e7681]";
    default:
      return "border-[#30363d] bg-[#1c2330] text-[#8b949e]";
  }
}

export function CompetitionDashboardCard({ competition: c }: { competition: CompetitionCard }) {
  const periode = formatDateRangeShort(c.date_debut, c.date_fin);
  const urgency = competitionCardUrgency(c);
  const urgencyStyle = COMPETITION_CARD_URGENCY[urgency];

  return (
    <Link
      href={`/competitions/${c.id}`}
      className={cn(
        "group block overflow-hidden rounded-xl border border-[#30363d] bg-[#161b22] transition",
        urgencyStyle.ring,
        urgencyStyle.outer
      )}
    >
      <div className={cn("border-l-4 p-4", urgencyStyle.borderL)}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate font-semibold text-[#e6edf3] group-hover:text-frmt-gold">
              {c.nom}
            </h3>
            <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[#8b949e]">
              <span className="inline-flex items-center gap-1 font-medium text-[#c9d1d9]">
                <Calendar className="h-3 w-3 text-frmt-gold" aria-hidden />
                {periode}
              </span>
              <span className="text-[#484f58]">·</span>
              <span>{c.lieu ?? "—"}</span>
              <span className="text-[#484f58]">·</span>
              <span>{c.categorie}</span>
            </p>
          </div>
          <span
            className={cn(
              "shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium",
              statutClass(c.statut_affichage)
            )}
          >
            {statutCompetitionLabel(c.statut_affichage)}
          </span>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <span
            className={cn(
              "rounded-full border px-2 py-0.5 text-[11px] font-medium",
              c.visas_requis
                ? "border-violet-500/45 bg-violet-500/15 text-violet-200"
                : "border-slate-500/40 bg-slate-700/30 text-slate-400"
            )}
          >
            {visasRequisLabel(c.visas_requis)}
          </span>
          {c.jours_avant >= 0 && c.statut_affichage === "a_venir" && (
            <span className="rounded-full border border-sky-500/35 bg-sky-500/10 px-2 py-0.5 text-[11px] text-sky-200">
              J-{c.jours_avant}
            </span>
          )}
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[11px]">
          <div className="rounded-md border border-[#30363d] bg-[#0d1117]/80 px-2 py-1.5">
            <Users className="mx-auto mb-0.5 h-3.5 w-3.5 text-blue-400/80" />
            <span className="font-semibold text-[#e6edf3]">{c.nb_participants}</span>
            <p className="text-[#6e7681]">participants</p>
          </div>
          <div
            className={cn(
              "rounded-md border px-2 py-1.5",
              c.visas_a_prevoir > 0
                ? "border-orange-500/50 bg-orange-500/15"
                : c.visas_requis
                  ? "border-emerald-500/30 bg-emerald-950/20"
                  : "border-[#30363d] bg-[#0d1117]/80"
            )}
          >
            <IdCard
              className={cn(
                "mx-auto mb-0.5 h-3.5 w-3.5",
                c.visas_a_prevoir > 0
                  ? "text-orange-300"
                  : c.visas_requis
                    ? "text-emerald-400/70"
                    : "text-[#8b949e]"
              )}
            />
            <span
              className={cn(
                "font-semibold",
                c.visas_a_prevoir > 0
                  ? "text-orange-200"
                  : c.visas_requis
                    ? "text-emerald-300"
                    : "text-[#e6edf3]"
              )}
            >
              {c.visas_requis ? c.visas_a_prevoir : "—"}
            </span>
            <p className="text-[#6e7681]">visas à prévoir</p>
          </div>
          <div
            className={cn(
              "rounded-md border px-2 py-1.5",
              c.billets_en_attente > 0
                ? "border-red-500/45 bg-red-500/15"
                : "border-[#30363d] bg-[#0d1117]/80"
            )}
          >
            <Plane
              className={cn(
                "mx-auto mb-0.5 h-3.5 w-3.5",
                c.billets_en_attente > 0 ? "text-red-300" : "text-[#8b949e]"
              )}
            />
            <span
              className={cn(
                "font-semibold",
                c.billets_en_attente > 0 ? "text-red-200" : "text-[#e6edf3]"
              )}
            >
              {c.billets_en_attente}
            </span>
            <p className="text-[#6e7681]">billets attente</p>
          </div>
        </div>

        <div className="mt-3">
          <div className="mb-1 flex justify-between text-[11px] text-[#8b949e]">
            <span>Préparation logistique</span>
            <span
              className={cn(
                "font-medium",
                c.pret_logistique_pct >= 75
                  ? "text-emerald-400"
                  : c.pret_logistique_pct >= 50
                    ? "text-amber-400"
                    : "text-red-400"
              )}
            >
              {c.pret_logistique_pct}%
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-[#0d1117]">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                c.pret_logistique_pct >= 75
                  ? "bg-gradient-to-r from-emerald-600 to-emerald-400"
                  : c.pret_logistique_pct >= 50
                    ? "bg-gradient-to-r from-amber-600 to-amber-400"
                    : "bg-gradient-to-r from-red-600 to-red-400"
              )}
              style={{ width: `${c.pret_logistique_pct}%` }}
            />
          </div>
        </div>

        <p className="mt-3 flex items-center justify-end gap-1 text-xs text-frmt-green opacity-0 transition group-hover:opacity-100">
          Ouvrir la fiche
          <ArrowRight className="h-3.5 w-3.5" />
        </p>
      </div>
    </Link>
  );
}
