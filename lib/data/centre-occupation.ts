import { getInfrastructures } from "@/lib/data/infrastructures";
import { getReservationsInfrastructure } from "@/lib/data/reservation-infra";
import { getStagesProgramme } from "@/lib/data/stages";
import { parseLogistiqueFromNotes } from "@/lib/stages/stage-logistique-serializer";
import type { Infrastructure } from "@/lib/types/infrastructures";

export type PeriodeOccupation = "semaine" | "mois" | "stage";

export type LigneOccupation = {
  infrastructure_id: string;
  nom: string;
  type: Infrastructure["type"];
  capacite: number;
  reserve: number;
  libre: number;
  pct: number;
  statut: string;
};

export type OccupationCentreResult = {
  periode: PeriodeOccupation;
  date_debut: string;
  date_fin: string;
  lignes: LigneOccupation[];
  parType: { type: string; capacite: number; reserve: number; pct: number }[];
};

function addDays(iso: string, n: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function daysBetween(start: string, end: string): number {
  const a = new Date(start);
  const b = new Date(end);
  return Math.max(1, Math.round((b.getTime() - a.getTime()) / 86400000) + 1);
}

function weekBounds(): { start: string; end: string } {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const mon = new Date(now);
  mon.setDate(now.getDate() + diff);
  return {
    start: mon.toISOString().slice(0, 10),
    end: addDays(mon.toISOString().slice(0, 10), 6),
  };
}

function monthBounds(): { start: string; end: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart.slice(0, 10) <= bEnd && bStart <= aEnd.slice(0, 10);
}

export function occupationBarColor(pct: number): string {
  if (pct <= 50) return "bg-emerald-500";
  if (pct <= 80) return "bg-amber-500";
  return "bg-red-500";
}

export async function getOccupationCentre(
  periode: PeriodeOccupation = "semaine",
  stageId?: string
): Promise<OccupationCentreResult> {
  const [infras, reservations, stages] = await Promise.all([
    getInfrastructures(),
    getReservationsInfrastructure(),
    getStagesProgramme(),
  ]);

  let date_debut: string;
  let date_fin: string;

  if (periode === "stage" && stageId) {
    const st = stages.find((s) => s.id === stageId);
    date_debut = st?.date_debut ?? new Date().toISOString().slice(0, 10);
    date_fin = st?.date_fin ?? date_debut;
  } else if (periode === "mois") {
    ({ start: date_debut, end: date_fin } = monthBounds());
  } else {
    ({ start: date_debut, end: date_fin } = weekBounds());
  }

  const nbJours = daysBetween(date_debut, date_fin);

  const stageIdsAvecTerrains = new Set(
    stages
      .filter((s) => {
        const p = parseLogistiqueFromNotes(s.notes);
        return p?.terrains?.actif || s.infrastructure_ids.length > 0;
      })
      .map((s) => s.id)
  );

  const stageFilter = (stage_id: string | null) => {
    if (!stage_id) return false;
    if (periode === "stage" && stageId) return stage_id === stageId;
    return stageIdsAvecTerrains.has(stage_id);
  };

  const lignes: LigneOccupation[] = infras
    .filter((i) => i.actif)
    .map((infra) => {
      const cap = Math.max(1, infra.capacite ?? 1) * nbJours;
      const resStage = reservations.filter(
        (r) =>
          r.infrastructure_id === infra.id &&
          r.statut !== "annulee" &&
          stageFilter(r.stage_id) &&
          overlaps(r.date_debut, r.date_fin, date_debut, date_fin)
      );
      const reserve = resStage.length;
      const pct = Math.min(100, Math.round((reserve / cap) * 100));
      return {
        infrastructure_id: infra.id,
        nom: infra.nom,
        type: infra.type,
        capacite: cap,
        reserve,
        libre: Math.max(0, cap - reserve),
        pct,
        statut: infra.statut,
      };
    });

  const byType = new Map<string, { capacite: number; reserve: number }>();
  for (const l of lignes) {
    const t = l.type;
    const prev = byType.get(t) ?? { capacite: 0, reserve: 0 };
    byType.set(t, {
      capacite: prev.capacite + l.capacite,
      reserve: prev.reserve + l.reserve,
    });
  }

  const parType = [...byType.entries()].map(([type, v]) => ({
    type,
    capacite: v.capacite,
    reserve: v.reserve,
    pct: v.capacite > 0 ? Math.min(100, Math.round((v.reserve / v.capacite) * 100)) : 0,
  }));

  return { periode, date_debut, date_fin, lignes, parType };
}
