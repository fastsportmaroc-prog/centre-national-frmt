import type { StageProgrammeV2, StatutStageV2 } from "@/lib/types/v2";

function stageDay(iso: string): string {
  return iso.slice(0, 10);
}

/**
 * Statut affiché (PDF, listes) aligné sur les dates du stage.
 * — Date fin passée → terminé (sauf annulé)
 * — Date début future → prévu ou confirmé (jamais terminé)
 * — En cours → confirmé si la base indique encore prévu / terminé à tort
 */
export function resolveEffectiveStageStatut(
  stage: Pick<StageProgrammeV2, "statut" | "date_debut" | "date_fin">,
  todayIso?: string
): StatutStageV2 | string {
  const today = todayIso ?? new Date().toISOString().slice(0, 10);
  const raw = String(stage.statut ?? "").toLowerCase();
  if (raw === "annule") return "annule";

  const debut = stageDay(stage.date_debut);
  const fin = stageDay(stage.date_fin);

  if (fin < today) return "termine";

  if (debut > today) {
    if (raw === "termine") return "prevu";
    return raw === "confirme" ? "confirme" : "prevu";
  }

  if (raw === "termine" || raw === "prevu") return "confirme";
  return stage.statut;
}
