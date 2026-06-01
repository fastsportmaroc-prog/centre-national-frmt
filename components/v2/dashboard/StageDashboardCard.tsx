"use client";

import Link from "next/link";
import { FileDown, Pencil, Eye, Calendar } from "lucide-react";
import { formatDateRangeShort } from "@/lib/v2/format-display-date";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";
import type { StageDashboardCard as StageCardData } from "@/lib/v2/dashboard-data";

type VisualState = "prevu" | "encours" | "termine" | "annule";

function stageVisualState(stage: StageCardData): VisualState {
  if (stage.statut === "annule") return "annule";
  if (stage.statut === "termine") return "termine";
  const today = new Date().toISOString().slice(0, 10);
  if (stage.date_debut <= today && stage.date_fin >= today) return "encours";
  return "prevu";
}

function statutPresentation(statut: string, visual: VisualState) {
  const map: Record<string, { label: string; badge: string }> = {
    confirme: { label: "Confirmé", badge: "stage-card-badge--status-encours" },
    prevu: { label: "Prévu", badge: "stage-card-badge--status-prevu" },
    termine: { label: "Terminé", badge: "stage-card-badge--status-termine" },
    annule: { label: "Annulé", badge: "stage-card-badge--status-annule" },
  };
  const base = map[statut] ?? map.prevu!;
  if (visual === "encours" && statut !== "annule" && statut !== "termine") {
    return { label: "En cours", badge: "stage-card-badge--status-encours" };
  }
  return base;
}

function ServiceBadge({ ok, label, icon }: { ok: boolean; label: string; icon: string }) {
  return (
    <span className={cn("stage-card-badge", ok ? "stage-card-badge--on" : "stage-card-badge--off")}>
      <span aria-hidden>{icon}</span>
      {label}
    </span>
  );
}

export function StageDashboardCard({
  stage,
  onPdf,
  onEdit,
}: {
  stage: StageCardData;
  onPdf?: () => void;
  onEdit?: () => void;
}) {
  const visual = stageVisualState(stage);
  const st = statutPresentation(String(stage.statut), visual);
  const pct = Math.round((stage.checklist_done / stage.checklist_total) * 100);
  const periode = formatDateRangeShort(stage.date_debut, stage.date_fin);
  const totalParticipants = stage.nb_joueurs + stage.nb_coachs;

  return (
    <div className={cn("v2-stage-card", `v2-stage-card--${visual}`)}>
      <div className="stage-card-body">
        <div className="stage-card-head">
          <div className="min-w-0 flex-1">
            <h3 className="stage-card-title">{stage.stage_action}</h3>
            <div className="stage-card-meta">
              <span className="stage-card-meta-date">
                <Calendar className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
                {periode}
              </span>
              <span className="stage-card-meta-sep">·</span>
              <span>
                {stage.jours_duree} jour{stage.jours_duree > 1 ? "s" : ""}
              </span>
            </div>
            <div className="mt-2">
              <span className="stage-card-badge stage-card-badge--category">{stage.categorie}</span>
            </div>
          </div>
          <span className={cn("stage-card-badge shrink-0", st.badge)}>{st.label}</span>
        </div>

        <div className="stage-card-divider" />

        <div className="stage-card-stats">
          <div className="stage-card-stat">
            <p className="stage-card-stat-value">{stage.nb_joueurs}</p>
            <p className="stage-card-stat-label">Joueurs</p>
          </div>
          <div className="stage-card-stat">
            <p className="stage-card-stat-value">{stage.nb_coachs}</p>
            <p className="stage-card-stat-label">Coachs</p>
          </div>
          <div className="stage-card-stat">
            <p className="stage-card-stat-value">{totalParticipants}</p>
            <p className="stage-card-stat-label">Total</p>
          </div>
        </div>

        <div className="stage-card-divider" />

        <div className="stage-card-badges">
          <ServiceBadge ok={stage.has_hebergement} label="Hébergement" icon="🏨" />
          <ServiceBadge ok={stage.has_restauration} label="Resto" icon="🍽️" />
          <ServiceBadge ok={stage.has_terrains} label="Terrains" icon="🎾" />
        </div>

        <div className="stage-card-progress-wrap">
          <div className="stage-card-progress-head">
            <span>Checklist {stage.checklist_done}/{stage.checklist_total}</span>
            <span className="stage-card-progress-pct">{pct}%</span>
          </div>
          <div className="stage-card-progress-track">
            <div
              className={cn("stage-card-progress-fill", `stage-card-progress-fill--${visual}`)}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <div className="stage-card-actions">
          <Link href={`/v2/stages/${encodeURIComponent(stage.id)}`}>
            <Button variant="secondary" className="stage-card-btn">
              <Eye aria-hidden />
              Détail
            </Button>
          </Link>
          {onPdf && (
            <Button variant="secondary" className="stage-card-btn" onClick={onPdf}>
              <FileDown aria-hidden />
              Fiche PDF
            </Button>
          )}
          {onEdit && (
            <Button variant="secondary" className="stage-card-btn" onClick={onEdit}>
              <Pencil aria-hidden />
              Modifier
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
