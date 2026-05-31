"use client";

import Link from "next/link";
import { FileDown, Pencil, Eye, Calendar } from "lucide-react";
import { formatDateRangeShort } from "@/lib/v2/format-display-date";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";
import { getCategoryStyle } from "@/lib/v2/category-colors";
import type { StageDashboardCard } from "@/lib/v2/dashboard-data";

function ServiceBadge({ ok, label, icon }: { ok: boolean; label: string; icon: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px]",
        ok
          ? "border-emerald-500/30 bg-[#0d3321] text-[#1d9e75]"
          : "border-[#30363d] bg-[#1c2330] text-[#484f58]"
      )}
    >
      {icon} {label} {ok ? "✓" : "✗"}
    </span>
  );
}

function statutLabel(statut: string) {
  const map: Record<string, { label: string; className: string }> = {
    confirme: { label: "Confirmé ✓", className: "border-emerald-500/30 bg-[#0d3321] text-[#1d9e75]" },
    prevu: { label: "Prévu", className: "border-[#30363d] bg-[#1c2330] text-[#8b949e]" },
    termine: { label: "Terminé", className: "border-[#30363d] bg-[#1a1f2e] text-[#6e7681] line-through" },
    annule: { label: "Annulé", className: "border-red-500/30 bg-[#2d1010] text-[#e74c3c]" },
  };
  return map[statut] ?? map.prevu!;
}

export function StageDashboardCard({
  stage,
  onPdf,
  onEdit,
}: {
  stage: StageDashboardCard;
  onPdf?: () => void;
  onEdit?: () => void;
}) {
  const cat = getCategoryStyle(stage.categorie);
  const st = statutLabel(String(stage.statut));
  const pct = Math.round((stage.checklist_done / stage.checklist_total) * 100);
  const periode = formatDateRangeShort(stage.date_debut, stage.date_fin);

  return (
    <div
      className="v2-stage-card overflow-hidden"
      style={{ borderLeftWidth: 3, borderLeftColor: cat.border }}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-semibold text-[#e6edf3]">{stage.stage_action}</h3>
            <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[#8b949e]">
              <span className="inline-flex items-center gap-1 font-medium text-[#c9d1d9]">
                <Calendar className="h-3 w-3 shrink-0 text-frmt-gold" aria-hidden />
                {periode}
              </span>
              <span className="text-[#484f58]">·</span>
              <span>
                {stage.jours_duree} jour{stage.jours_duree > 1 ? "s" : ""}
              </span>
              <span className="text-[#484f58]">·</span>
              <span>{stage.categorie}</span>
            </p>
          </div>
          <span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium", st.className)}>
            {st.label}
          </span>
        </div>

        <div className="my-3 border-t border-[#30363d]" />

        <p className="text-sm text-[#8b949e]">
          👥 {stage.nb_joueurs} joueur{stage.nb_joueurs !== 1 ? "s" : ""} · 👤 {stage.nb_coachs} coach
          {stage.nb_coachs !== 1 ? "s" : ""} · {stage.nb_joueurs + stage.nb_coachs} participants
        </p>

        <div className="my-3 border-t border-[#30363d]" />

        <div className="flex flex-wrap gap-1.5">
          <ServiceBadge ok={stage.has_hebergement} label="Héberg." icon="🏨" />
          <ServiceBadge ok={stage.has_restauration} label="Resto" icon="🍽️" />
          <ServiceBadge ok={stage.has_terrains} label="Terrains" icon="🎾" />
          <span className="inline-flex items-center rounded-md border border-[#30363d] bg-[#1c2330] px-2 py-0.5 text-[11px] text-[#8b949e]">
            📋 Checklist {stage.checklist_done}/{stage.checklist_total}
          </span>
        </div>

        <div className="mt-2 h-1 overflow-hidden rounded-full bg-[#0d1117]">
          <div className="h-full rounded-full bg-frmt-gold transition-all" style={{ width: `${pct}%` }} />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Link href={`/v2/stages/${encodeURIComponent(stage.id)}`}>
            <Button variant="secondary" className="h-8 gap-1 text-xs">
              <Eye className="h-3.5 w-3.5" /> Détail
            </Button>
          </Link>
          {onPdf && (
            <Button variant="secondary" className="h-8 gap-1 text-xs" onClick={onPdf}>
              <FileDown className="h-3.5 w-3.5" /> Fiche PDF
            </Button>
          )}
          {onEdit && (
            <Button variant="secondary" className="h-8 gap-1 text-xs" onClick={onEdit}>
              <Pencil className="h-3.5 w-3.5" /> Modifier
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
