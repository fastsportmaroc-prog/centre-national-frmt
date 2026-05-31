import type { RestaurationStageV2 } from "@/lib/types/v2";

export function buildMealTotals(
  r: RestaurationStageV2,
  jours: number
): { pdj: number; dej: number; diner: number; total: number } {
  const pdj = r.petit_dejeuner ? r.nb_personnes * jours : 0;
  const dej = r.dejeuner ? r.nb_personnes * jours : 0;
  const diner = r.diner ? r.nb_personnes * jours : 0;
  return { pdj, dej, diner, total: pdj + dej + diner };
}
