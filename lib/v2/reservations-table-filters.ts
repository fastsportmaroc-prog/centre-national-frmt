import type { ReservationEnrichedV2 } from "@/lib/types/v2";

export type TableGroupBy = "all" | "categorie" | "stage" | "coach";

export type TableFilterOption = { value: string; label: string };

export type TableReservationSection = {
  key: string;
  label: string;
  rows: ReservationEnrichedV2[];
};

export function coachDisplayName(r: Pick<ReservationEnrichedV2, "coach_prenom" | "coach_nom">): string {
  const parts = [r.coach_prenom?.trim(), r.coach_nom?.trim()].filter(Boolean);
  return parts.length ? parts.join(" ") : "Sans coach";
}

export function tableGroupKey(r: ReservationEnrichedV2, groupBy: TableGroupBy): string {
  switch (groupBy) {
    case "categorie":
      return (r.stage_categorie?.trim() || "sans-categorie").toLowerCase();
    case "stage":
      return r.stage_id ?? "sans-stage";
    case "coach": {
      const name = coachDisplayName(r);
      return name === "Sans coach" ? "sans-coach" : name.toLowerCase();
    }
    default:
      return "all";
  }
}

export function tableGroupLabel(r: ReservationEnrichedV2, groupBy: TableGroupBy): string {
  switch (groupBy) {
    case "categorie":
      return r.stage_categorie?.trim() || "Sans catégorie";
    case "stage":
      return r.stage_nom?.trim() || "Sans stage";
    case "coach":
      return coachDisplayName(r);
    default:
      return "Toutes les réservations";
  }
}

export function buildTableFilterOptions(
  rows: ReservationEnrichedV2[],
  groupBy: TableGroupBy
): TableFilterOption[] {
  if (groupBy === "all") return [];

  const map = new Map<string, string>();
  for (const r of rows) {
    const key = tableGroupKey(r, groupBy);
    if (!map.has(key)) map.set(key, tableGroupLabel(r, groupBy));
  }

  return [...map.entries()]
    .sort(([, a], [, b]) => a.localeCompare(b, "fr", { sensitivity: "base" }))
    .map(([value, label]) => ({ value, label }));
}

export function splitReservationsForTable(
  rows: ReservationEnrichedV2[],
  groupBy: TableGroupBy,
  valueFilter: string
): TableReservationSection[] {
  let working = rows;
  if (groupBy !== "all" && valueFilter !== "all") {
    working = rows.filter((r) => tableGroupKey(r, groupBy) === valueFilter);
  }

  if (groupBy === "all") {
    return [{ key: "all", label: "Toutes les réservations", rows: working }];
  }

  const sections = new Map<string, TableReservationSection>();
  for (const r of working) {
    const key = tableGroupKey(r, groupBy);
    if (!sections.has(key)) {
      sections.set(key, { key, label: tableGroupLabel(r, groupBy), rows: [] });
    }
    sections.get(key)!.rows.push(r);
  }

  return [...sections.values()].sort((a, b) =>
    a.label.localeCompare(b.label, "fr", { sensitivity: "base" })
  );
}

export const TABLE_GROUP_LABELS: Record<TableGroupBy, string> = {
  all: "Tout",
  categorie: "Catégorie",
  stage: "Stage",
  coach: "Coach",
};
