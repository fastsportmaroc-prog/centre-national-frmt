import type { StageProgrammeV2 } from "@/lib/types/v2";

export type StageLifecycleFilter = "all" | "avenir" | "termine" | "annule";

export const STAGE_LIFECYCLE_OPTIONS: { value: StageLifecycleFilter; label: string }[] = [
  { value: "all", label: "Tous les stages" },
  { value: "avenir", label: "À venir" },
  { value: "termine", label: "Terminés" },
  { value: "annule", label: "Annulés" },
];

function stageDay(iso: string): string {
  return iso.slice(0, 10);
}

/** Même logique que la liste Stages V2. */
export function stageMatchesLifecycleFilter(
  stage: Pick<StageProgrammeV2, "statut" | "date_debut" | "date_fin">,
  filter: StageLifecycleFilter,
  todayIso?: string
): boolean {
  if (filter === "all") return true;
  const today = todayIso ?? new Date().toISOString().slice(0, 10);
  const statut = String(stage.statut ?? "").toLowerCase();
  const debut = stageDay(stage.date_debut);
  const fin = stageDay(stage.date_fin);

  if (filter === "annule") return statut === "annule";
  if (filter === "termine") return statut === "termine" || fin < today;
  if (filter === "avenir") return statut !== "annule" && debut > today;
  return true;
}

export function lifecycleFilterLabel(filter: StageLifecycleFilter): string {
  return STAGE_LIFECYCLE_OPTIONS.find((o) => o.value === filter)?.label ?? filter;
}
