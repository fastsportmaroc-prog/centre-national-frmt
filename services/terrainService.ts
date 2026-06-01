export {
  getTerrains,
  getOccupation,
  getCalendrierTerrain,
  getCalendrierPeriode,
  getCalendrierMois,
  getReservationsStageTerrains,
  verifierConflits,
  reserverTerrains,
  resyncStageTerrainsFromNotes,
  resyncAllStageTerrainsFromNotes,
  supprimerReservationsStage,
  upgradeStageTerrainsMatinToJourneeInDb,
  supprimerReservationTerrain,
} from "@/lib/data/terrains";

export type { Creneau, ModeDispatch, TerrainBesoin } from "@/lib/data/terrains";

export {
  detectConflicts,
  hasConflict,
  conflictIdSet,
  timeSlotsOverlap,
  getTimeRange,
} from "@/services/conflictDetector";

export { CRENEAU_TIMES, getCreneauRange, normalizeCreneauKey } from "@/services/terrain-constants";

export { syncStagePlanningWithTerrainReservations } from "@/lib/v2/sync-stage-planning";
