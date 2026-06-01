import type { StageProgrammeV2 } from "@/lib/types/v2";
import { normalizeStatut } from "@/lib/v2/reservations-utils";
import type { PeriodeFilter } from "@/lib/v2/reservations-utils";
import { endOfMonth, endOfWeek, format, startOfMonth, startOfWeek } from "date-fns";

export type LogistiqueStageFilters = {
  stageId: string;
  dateDebut: string;
  dateFin: string;
  periode: PeriodeFilter;
  categorie: string;
  statut: string;
  search: string;
};

export function emptyLogistiqueFilters(): LogistiqueStageFilters {
  return {
    stageId: "",
    dateDebut: "",
    dateFin: "",
    periode: "all",
    categorie: "",
    statut: "",
    search: "",
  };
}

export function periodsOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string
): boolean {
  const a0 = String(aStart).slice(0, 10);
  const a1 = String(aEnd).slice(0, 10);
  const b0 = String(bStart).slice(0, 10);
  const b1 = String(bEnd).slice(0, 10);
  return a0 <= b1 && a1 >= b0;
}

export function getPeriodeBounds(periode: PeriodeFilter): { from: string; to: string } | null {
  if (periode === "all") return null;
  const now = new Date();
  if (periode === "week") {
    return {
      from: format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd"),
      to: format(endOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd"),
    };
  }
  if (periode === "month") {
    return {
      from: format(startOfMonth(now), "yyyy-MM-dd"),
      to: format(endOfMonth(now), "yyyy-MM-dd"),
    };
  }
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return {
    from: format(startOfMonth(next), "yyyy-MM-dd"),
    to: format(endOfMonth(next), "yyyy-MM-dd"),
  };
}

export function resolveActiveDateBounds(filters: LogistiqueStageFilters): {
  from: string;
  to: string;
} | null {
  if (filters.dateDebut || filters.dateFin) {
    return {
      from: filters.dateDebut || "1970-01-01",
      to: filters.dateFin || "2099-12-31",
    };
  }
  return getPeriodeBounds(filters.periode);
}

export function countActiveLogistiqueFilters(filters: LogistiqueStageFilters): number {
  let n = 0;
  if (filters.stageId) n++;
  if (filters.categorie) n++;
  if (filters.statut) n++;
  if (filters.search.trim()) n++;
  if (filters.dateDebut || filters.dateFin) n++;
  else if (filters.periode !== "all") n++;
  return n;
}

export function stageMatchesSearch(stage: StageProgrammeV2, itemRemarques: string | null | undefined, q: string): boolean {
  if (!q) return true;
  const hay = [
    stage.stage_action,
    stage.categorie,
    stage.lieu ?? "",
    itemRemarques ?? "",
  ]
    .join(" ")
    .toLowerCase();
  return hay.includes(q);
}

export function filterLogistiqueStageRows<
  T extends { stage_id: string; date_debut: string; date_fin: string; statut: string; remarques?: string | null },
>(
  items: T[],
  stages: StageProgrammeV2[],
  filters: LogistiqueStageFilters,
  extra?: (item: T, stage: StageProgrammeV2) => boolean
): Array<{ item: T; stage: StageProgrammeV2 }> {
  const stageMap = new Map(stages.map((s) => [s.id, s]));
  const bounds = resolveActiveDateBounds(filters);
  const q = filters.search.trim().toLowerCase();
  const statutFilter = filters.statut ? normalizeStatut(filters.statut) : "";

  return items
    .map((item) => ({ item, stage: stageMap.get(item.stage_id) }))
    .filter((row): row is { item: T; stage: StageProgrammeV2 } => {
      if (!row.stage) return false;
      const { item, stage } = row;
      if (filters.stageId && item.stage_id !== filters.stageId) return false;
      if (filters.categorie && stage.categorie !== filters.categorie) return false;
      if (statutFilter && normalizeStatut(item.statut) !== statutFilter) return false;
      if (bounds && !periodsOverlap(item.date_debut, item.date_fin, bounds.from, bounds.to)) {
        return false;
      }
      if (!stageMatchesSearch(stage, item.remarques, q)) return false;
      if (extra && !extra(item, stage)) return false;
      return true;
    })
    .sort((a, b) => a.stage.date_debut.localeCompare(b.stage.date_debut));
}

export const LOGISTIQUE_PERIODE_OPTIONS: { value: PeriodeFilter; label: string }[] = [
  { value: "week", label: "Cette semaine" },
  { value: "month", label: "Ce mois" },
  { value: "next_month", label: "Mois prochain" },
  { value: "all", label: "Toutes les dates" },
];

export const LOGISTIQUE_STATUT_OPTIONS = [
  { value: "", label: "Tous les statuts" },
  { value: "prevu", label: "Prévu" },
  { value: "confirme", label: "Confirmé" },
  { value: "annule", label: "Annulé" },
];
