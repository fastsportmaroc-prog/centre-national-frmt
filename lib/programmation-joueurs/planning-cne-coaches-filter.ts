import { matchesEntityCategory } from "@/lib/auth/player-category-context";
import type { ProgrammationEvenementEnriched } from "@/lib/types/programmation-joueurs";
import type { EntraineurV2 } from "@/lib/types/v2";

/**
 * Coaches visibles dans le planning CNE : ceux liés aux stages / événements
 * des catégories autorisées pour l'utilisateur (ex. Elite Pro uniquement).
 */
export function filterCoachesForPlanningScope(
  coaches: EntraineurV2[],
  evenements: ProgrammationEvenementEnriched[],
  options: {
    allowedJoueurIds: Set<string>;
    allowedCategories: string[];
    categoryRestricted: boolean;
  }
): EntraineurV2[] {
  const active = coaches.filter((c) => (c.statut ?? "actif") === "actif");
  if (!options.categoryRestricted) return active;

  const allowedCoachColIds = new Set<string>();

  for (const e of evenements) {
    const colId = e.cne_column_id;
    if (!colId?.startsWith("coach-")) continue;
    if (matchesEntityCategory(e.categorie_tournoi, options.allowedCategories, false)) {
      allowedCoachColIds.add(colId);
    }
  }

  const stageIds = new Set(
    evenements
      .filter((e) => options.allowedJoueurIds.has(e.joueur_id) && e.stage_programme_id)
      .map((e) => e.stage_programme_id as string)
  );
  for (const e of evenements) {
    const colId = e.cne_column_id;
    if (
      colId?.startsWith("coach-") &&
      e.stage_programme_id &&
      stageIds.has(e.stage_programme_id)
    ) {
      allowedCoachColIds.add(colId);
    }
  }

  if (!allowedCoachColIds.size) return [];
  return active.filter((c) => allowedCoachColIds.has(`coach-${c.id}`));
}
