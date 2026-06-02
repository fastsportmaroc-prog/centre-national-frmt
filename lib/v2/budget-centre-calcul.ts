import type { TarifsBudgetSettings } from "@/lib/types/v2";
import { BUDGET_TARIFS_DEFAULTS } from "@/lib/v2/settings-store";
import { buildMealTotals } from "@/lib/v2/restauration-meals";
import type { RestaurationStageV2 } from "@/lib/types/v2";
import { countDaysInclusive } from "@/lib/v2/stage-calculations";

/** Hébergement : coaches en single, joueurs en double (aligné pages V2). */
export function computeHebergementPrevuMad(
  chJoueurs: number,
  chCoachs: number,
  nuits: number,
  tarifs: TarifsBudgetSettings = BUDGET_TARIFS_DEFAULTS
): number {
  if (nuits <= 0) return 0;
  return (
    nuits *
    (Math.max(0, chCoachs) * tarifs.prix_chambre_single_mad +
      Math.max(0, chJoueurs) * tarifs.prix_chambre_double_mad)
  );
}

export function computeRestaurationPrevuMad(
  pdj: number,
  dej: number,
  diner: number,
  tarifs: TarifsBudgetSettings = BUDGET_TARIFS_DEFAULTS
): number {
  return (
    Math.max(0, pdj) * tarifs.prix_petit_dejeuner_mad +
    Math.max(0, dej) * tarifs.prix_dejeuner_mad +
    Math.max(0, diner) * tarifs.prix_diner_mad
  );
}

export function computeRestaurationStagePrevuMad(
  restauration: RestaurationStageV2,
  tarifs: TarifsBudgetSettings = BUDGET_TARIFS_DEFAULTS
): number {
  const jours = countDaysInclusive(restauration.date_debut, restauration.date_fin);
  const totals = buildMealTotals(restauration, jours);
  return computeRestaurationPrevuMad(totals.pdj, totals.dej, totals.diner, tarifs);
}

/** Estimation terrains : jours du stage × tarif/jour (Paramètres). */
export function computeTerrainsPrevuMad(
  jours: number,
  actif: boolean,
  tarifs: TarifsBudgetSettings = BUDGET_TARIFS_DEFAULTS
): number {
  if (!actif) return 0;
  return Math.max(0, jours) * Math.max(0, tarifs.prix_terrain_jour_mad);
}
