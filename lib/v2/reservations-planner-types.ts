import type { PlanningSeanceV2 } from "@/lib/types/v2";

export type PlanningSlotEnriched = PlanningSeanceV2 & {
  stage_nom: string | null;
  court_nom: string | null;
};
