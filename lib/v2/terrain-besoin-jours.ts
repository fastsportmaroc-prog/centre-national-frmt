import type { TerrainBesoin } from "@/lib/data/terrains";
import { eachDayOfStage } from "@/lib/v2/stage-calculations";

/** Jours effectifs pour un besoin terrain (sync + affichage). */
export function resolveTerrainBesoinJours(
  besoin: TerrainBesoin,
  stageDateDebut: string,
  stageDateFin: string
): string[] {
  const stageDays = eachDayOfStage(stageDateDebut, stageDateFin);
  if (besoin.mode === "dispatch") {
    if (besoin.jours?.length) {
      return [...new Set(besoin.jours.map((d) => d.slice(0, 10)).filter(Boolean))].sort();
    }
    return stageDays;
  }
  // Stage entier : toute la période du stage (pas seulement les jours cochés une fois)
  return stageDays;
}

export function expandTerrainBesoinsForStagePeriod(
  besoins: TerrainBesoin[],
  stageDateDebut: string,
  stageDateFin: string
): TerrainBesoin[] {
  return besoins.map((b) => ({
    ...b,
    jours: resolveTerrainBesoinJours(b, stageDateDebut, stageDateFin),
  }));
}
