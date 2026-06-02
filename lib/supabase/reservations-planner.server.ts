import "server-only";

import { getSupabaseServerDataClient } from "@/lib/supabase/data-client.server";
import { loadReservationsPageServer } from "@/lib/supabase/reservations-read.server";
import type { PlanningSlotEnriched } from "@/lib/v2/reservations-planner-types";
import type { PlanningSeanceV2, ReservationEnrichedV2, StageProgrammeV2 } from "@/lib/types/v2";

export type { PlanningSlotEnriched } from "@/lib/v2/reservations-planner-types";

export async function loadPlanningSlotsServer(options?: {
  dateDebut?: string;
  dateFin?: string;
}): Promise<PlanningSlotEnriched[]> {
  const supabase = await getSupabaseServerDataClient();
  let q = supabase
    .from("planning")
    .select("*")
    .not("infrastructure_id", "is", null)
    .not("stage_id", "is", null)
    .order("date", { ascending: true })
    .order("heure_debut", { ascending: true });

  if (options?.dateDebut) q = q.gte("date", options.dateDebut.slice(0, 10));
  if (options?.dateFin) q = q.lte("date", options.dateFin.slice(0, 10));

  const { data: rows, error } = await q;
  if (error) {
    console.warn("[loadPlanningSlotsServer]", error.message);
    return [];
  }

  const planning = (rows ?? []) as PlanningSeanceV2[];
  const stageIds = [...new Set(planning.map((p) => p.stage_id).filter(Boolean))] as string[];
  const infraIds = [...new Set(planning.map((p) => p.infrastructure_id).filter(Boolean))] as string[];

  const [stagesRes, infraRes] = await Promise.all([
    stageIds.length
      ? supabase.from("stages_programme").select("id, stage_action").in("id", stageIds)
      : Promise.resolve({ data: [] }),
    infraIds.length
      ? supabase.from("infrastructures").select("id, nom").in("id", infraIds)
      : Promise.resolve({ data: [] }),
  ]);

  const stageMap = new Map(
    ((stagesRes.data ?? []) as Pick<StageProgrammeV2, "id" | "stage_action">[]).map((s) => [
      s.id,
      s.stage_action,
    ])
  );
  const infraMap = new Map(
    ((infraRes.data ?? []) as { id: string; nom: string }[]).map((i) => [i.id, i.nom])
  );

  return planning.map((p) => ({
    ...p,
    stage_nom: stageMap.get(p.stage_id) ?? null,
    court_nom: p.infrastructure_id ? infraMap.get(p.infrastructure_id) ?? null : null,
  }));
}

export async function loadReservationsPlannerBundle(options?: {
  dateDebut?: string;
  dateFin?: string;
}): Promise<{
  reservations: ReservationEnrichedV2[];
  planning: PlanningSlotEnriched[];
}> {
  const [reservations, planning] = await Promise.all([
    loadReservationsPageServer(options),
    loadPlanningSlotsServer(options),
  ]);
  return { reservations, planning };
}
