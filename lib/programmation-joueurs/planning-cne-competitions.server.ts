import "server-only";

import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getSupabaseServerDataClient } from "@/lib/supabase/data-client.server";
import { resolveJoueurIdsForCategorie } from "@/lib/programmation-joueurs/category-joueurs.server";
import type { ProgrammationFilters } from "@/lib/types/programmation-joueurs";

export type CompetitionRow = {
  id: string;
  nom: string;
  categorie: string | null;
  date_debut: string;
  date_fin: string;
  lieu: string | null;
  statut: string;
};

export type CompetitionParticipantRow = {
  competition_id: string;
  participant_id: string;
  participant_type: string;
};

export type CompetitionPlanningData = {
  competitions: CompetitionRow[];
  participants: CompetitionParticipantRow[];
};

/**
 * Charge les compétitions officielles (table `competitions`) qui chevauchent la
 * période, avec leurs participants (joueurs + coaches) via
 * `competition_participants`. Aucune table modifiée — lecture seule.
 */
export async function fetchCompetitionPlanningData(
  filters?: ProgrammationFilters
): Promise<CompetitionPlanningData> {
  if (!isSupabaseConfigured()) {
    return { competitions: [], participants: [] };
  }

  try {
    const supabase = await getSupabaseServerDataClient();
    let q = supabase
      .from("competitions")
      .select("id, nom, categorie, date_debut, date_fin, lieu, statut")
      .neq("statut", "annulee")
      .order("date_debut", { ascending: true });

    if (filters?.dateDebut) q = q.gte("date_fin", filters.dateDebut.slice(0, 10));
    if (filters?.dateFin) q = q.lte("date_debut", filters.dateFin.slice(0, 10));

    const { data: competitions, error } = await q;
    if (error || !competitions?.length) {
      return { competitions: [], participants: [] };
    }

    const compIds = competitions.map((c) => c.id as string);
    const { data: participantRows } = await supabase
      .from("competition_participants")
      .select("competition_id, participant_id, participant_type")
      .in("competition_id", compIds)
      .in("participant_type", ["joueur", "coach"]);

    let participants = (participantRows ?? []) as CompetitionParticipantRow[];

    if (filters?.joueurId) {
      participants = participants.filter(
        (p) =>
          p.participant_type !== "joueur" || p.participant_id === filters.joueurId
      );
    } else if (filters?.joueurIds?.length) {
      const allowed = new Set(filters.joueurIds);
      participants = participants.filter(
        (p) => p.participant_type !== "joueur" || allowed.has(p.participant_id)
      );
    }

    if (filters?.categorieJoueur) {
      const ids = await resolveJoueurIdsForCategorie(supabase, filters.categorieJoueur);
      const allowedJoueurIds = new Set(ids);
      participants = participants.filter(
        (p) => p.participant_type !== "joueur" || allowedJoueurIds.has(p.participant_id)
      );
    }

    return {
      competitions: competitions as CompetitionRow[],
      participants,
    };
  } catch {
    return { competitions: [], participants: [] };
  }
}
