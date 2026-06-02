import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseServerDataClient } from "@/lib/supabase/data-client.server";
import {
  applyReservationDateRangeByStartDay,
  fetchAllPages,
} from "@/lib/supabase/paged-select";
import type {
  EntraineurV2,
  InfrastructureV2,
  ReservationEnrichedV2,
  ReservationInfraV2,
  StageCoachV2,
  StageProgrammeV2,
} from "@/lib/types/v2";

const STAGES = "stages_programme";

function enrichRows(
  reservations: ReservationInfraV2[],
  stages: StageProgrammeV2[],
  infrastructures: InfrastructureV2[],
  entraineurs: EntraineurV2[],
  stageCoachLinks: StageCoachV2[]
): ReservationEnrichedV2[] {
  const stageMap = new Map(stages.map((s) => [s.id, s]));
  const infraMap = new Map(infrastructures.map((i) => [i.id, i]));
  const coachMap = new Map(entraineurs.map((e) => [e.id, e]));
  const stageFirstCoach = new Map<string, string>();
  for (const link of stageCoachLinks) {
    if (!stageFirstCoach.has(link.stage_id)) stageFirstCoach.set(link.stage_id, link.coach_id);
  }

  return reservations.map((r) => {
    const stage = r.stage_id ? stageMap.get(r.stage_id) : null;
    const infra = infraMap.get(r.infrastructure_id);
    const coachId = r.entraineur_id ?? (r.stage_id ? stageFirstCoach.get(r.stage_id) : null);
    const coach = coachId ? coachMap.get(coachId) : null;
    return {
      ...r,
      stage_nom: stage?.stage_action ?? null,
      stage_categorie: stage?.categorie ?? null,
      court_nom: infra?.nom ?? null,
      court_surface: infra?.surface ?? null,
      infrastructure_type: infra?.type ?? null,
      coach_nom: coach?.nom ?? null,
      coach_prenom: coach?.prenom ?? null,
      groupe: stage?.categorie ?? null,
    };
  });
}

async function fetchInfraReservations(
  supabase: SupabaseClient,
  options?: { dateDebut?: string; dateFin?: string }
): Promise<ReservationInfraV2[]> {
  return fetchAllPages<ReservationInfraV2>((from, to) => {
    let q = supabase
      .from("reservations_infrastructure")
      .select("*")
      .order("date_debut", { ascending: true });
    q = applyReservationDateRangeByStartDay(q, options?.dateDebut, options?.dateFin);
    return q.range(from, to).then(({ data, error }) => ({
      data: data as ReservationInfraV2[] | null,
      error,
    }));
  });
}

/** Lecture réservations V2 côté serveur — source unique `reservations_infrastructure`. */
export async function loadReservationsPageServer(options?: {
  dateDebut?: string;
  dateFin?: string;
}): Promise<ReservationEnrichedV2[]> {
  const supabase = await getSupabaseServerDataClient();

  const [reservations, stagesRes, infraRes, coachRes, linksRes] = await Promise.all([
    fetchInfraReservations(supabase, options),
    supabase.from(STAGES).select("*").order("date_debut", { ascending: false }),
    supabase.from("infrastructures").select("*").order("nom"),
    supabase.from("entraineurs").select("*").order("nom"),
    supabase.from("stage_coachs").select("stage_id, coach_id"),
  ]);

  const stages = (stagesRes.data ?? []) as StageProgrammeV2[];
  const infrastructures = (infraRes.data ?? []) as InfrastructureV2[];
  const entraineurs = (coachRes.data ?? []) as EntraineurV2[];
  const stageCoachLinks = (linksRes.data ?? []) as StageCoachV2[];

  return enrichRows(reservations, stages, infrastructures, entraineurs, stageCoachLinks).sort(
    (a, b) => a.date_debut.localeCompare(b.date_debut)
  );
}
