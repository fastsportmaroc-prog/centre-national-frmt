import "server-only";

import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getSupabaseServerDataClient } from "@/lib/supabase/data-client.server";
import { resolveJoueurIdsForCategorie } from "@/lib/programmation-joueurs/category-joueurs.server";
import type { ProgrammationFilters } from "@/lib/types/programmation-joueurs";
import type { StageCoachV2, StageJoueurV2, StageProgrammeV2 } from "@/lib/types/v2";

export type StageProgrammePlanningData = {
  stages: StageProgrammeV2[];
  joueurLinks: StageJoueurV2[];
  coachLinks: StageCoachV2[];
};

export async function fetchStageProgrammePlanningData(
  filters?: ProgrammationFilters
): Promise<StageProgrammePlanningData> {
  if (!isSupabaseConfigured()) {
    return { stages: [], joueurLinks: [], coachLinks: [] };
  }

  try {
    const supabase = await getSupabaseServerDataClient();
    let q = supabase
      .from("stages_programme")
      .select("*")
      .neq("statut", "annule")
      .order("date_debut", { ascending: true });

    if (filters?.dateDebut) {
      q = q.gte("date_fin", filters.dateDebut.slice(0, 10));
    }
    if (filters?.dateFin) {
      q = q.lte("date_debut", filters.dateFin.slice(0, 10));
    }

    const { data: stages, error } = await q;
    if (error || !stages?.length) {
      return { stages: [], joueurLinks: [], coachLinks: [] };
    }

    const stageIds = stages.map((s) => s.id as string);
    const [{ data: joueurLinks }, { data: coachLinks }] = await Promise.all([
      supabase.from("stage_joueurs").select("stage_id, joueur_id").in("stage_id", stageIds),
      supabase.from("stage_coachs").select("stage_id, coach_id").in("stage_id", stageIds),
    ]);

    let links = (joueurLinks ?? []) as StageJoueurV2[];
    if (filters?.joueurId) {
      links = links.filter((l) => l.joueur_id === filters.joueurId);
    } else if (filters?.joueurIds?.length) {
      const allowed = new Set(filters.joueurIds);
      links = links.filter((l) => allowed.has(l.joueur_id));
    }

    if (filters?.categorieJoueur) {
      const ids = await resolveJoueurIdsForCategorie(supabase, filters.categorieJoueur);
      const allowedJoueurIds = new Set(ids);
      links = links.filter((l) => allowedJoueurIds.has(l.joueur_id));
    }

    return {
      stages: stages as StageProgrammeV2[],
      joueurLinks: links,
      coachLinks: (coachLinks ?? []) as StageCoachV2[],
    };
  } catch {
    return { stages: [], joueurLinks: [], coachLinks: [] };
  }
}
