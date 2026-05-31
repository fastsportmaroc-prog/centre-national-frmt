import type { HebergementStageV2, RestaurationStageV2, TarifsBudgetSettings } from "@/lib/types/v2";
import { BUDGET_TARIFS_DEFAULTS } from "@/lib/v2/settings-store";
import {
  computeHebergementPrevuMad,
  computeRestaurationStagePrevuMad,
  computeTerrainsPrevuMad,
} from "@/lib/v2/budget-centre-calcul";
import { countDaysInclusive, countNightsHebergement } from "@/lib/v2/stage-calculations";

export type StageBudgetEstimateMad = {
  hebergement: number;
  restauration: number;
  terrains: number;
  total: number;
  jours: number;
  nuits: number;
};

/** Même logique que l’onglet Budget de la fiche stage (tarifs Paramètres). */
export function computeStageBudgetEstimateMad(input: {
  dateDebut: string;
  dateFin: string;
  terrainsActif: boolean;
  hebergement?: HebergementStageV2 | null;
  restauration?: RestaurationStageV2 | null;
  tarifs?: TarifsBudgetSettings;
}): StageBudgetEstimateMad {
  const tarifs = input.tarifs ?? BUDGET_TARIFS_DEFAULTS;
  const jours = countDaysInclusive(input.dateDebut, input.dateFin);
  const nuits = input.hebergement
    ? countNightsHebergement(
        input.hebergement.date_debut ?? input.dateDebut,
        input.hebergement.date_fin ?? input.dateFin
      )
    : countNightsHebergement(input.dateDebut, input.dateFin);

  const chJoueurs = input.hebergement?.nb_chambres_joueurs ?? 0;
  const chCoachs = input.hebergement?.nb_chambres_coachs ?? 0;
  const hebergement = computeHebergementPrevuMad(chJoueurs, chCoachs, nuits, tarifs);
  const restauration = input.restauration
    ? computeRestaurationStagePrevuMad(input.restauration, tarifs)
    : 0;
  const terrains = computeTerrainsPrevuMad(jours, input.terrainsActif);

  return {
    hebergement,
    restauration,
    terrains,
    total: hebergement + restauration + terrains,
    jours,
    nuits,
  };
}

export function formatMad(amount: number): string {
  return `${amount.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MAD`;
}
