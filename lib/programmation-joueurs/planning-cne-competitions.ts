import type {
  ProgrammationEvenementEnriched,
  ProgrammationStatut,
} from "@/lib/types/programmation-joueurs";
import type {
  CompetitionParticipantRow,
  CompetitionRow,
} from "@/lib/programmation-joueurs/planning-cne-competitions.server";

export const CNE_COMPETITION_EVENT_PREFIX = "cne-comp:";

export function isCompetitionVirtualEvent(ev: ProgrammationEvenementEnriched): boolean {
  return ev.id.startsWith(CNE_COMPETITION_EVENT_PREFIX);
}

function rangesOverlap(startA: string, endA: string, startB: string, endB: string): boolean {
  return startA.slice(0, 10) <= endB.slice(0, 10) && startB.slice(0, 10) <= endA.slice(0, 10);
}

function competitionOverlapsRange(
  comp: CompetitionRow,
  dateDebut?: string,
  dateFin?: string
): boolean {
  if (!dateDebut && !dateFin) return true;
  return rangesOverlap(
    comp.date_debut,
    comp.date_fin,
    dateDebut?.slice(0, 10) ?? "0000-01-01",
    dateFin?.slice(0, 10) ?? "9999-12-31"
  );
}

function resolveCompetitionStatut(comp: CompetitionRow): ProgrammationStatut {
  const today = new Date().toISOString().slice(0, 10);
  if (comp.statut === "terminee" || comp.date_fin < today) return "termine";
  if (comp.date_debut <= today && comp.date_fin >= today) return "en_cours";
  if (comp.statut === "en_cours") return "en_cours";
  return "a_venir";
}

function baseCompetitionEvent(
  comp: CompetitionRow,
  columnId: string,
  ownerId: string,
  suffix: string
): ProgrammationEvenementEnriched {
  const now = new Date().toISOString();
  return {
    id: `${CNE_COMPETITION_EVENT_PREFIX}${comp.id}:${suffix}`,
    joueur_id: ownerId,
    cne_column_id: columnId,
    stage_programme_id: null,
    type: "competition_nationale",
    nom: comp.nom.trim(),
    pays: null,
    ville: comp.lieu?.trim() || null,
    date_debut: comp.date_debut.slice(0, 10),
    date_fin: comp.date_fin.slice(0, 10),
    surface: null,
    altitude: null,
    categorie_tournoi: comp.categorie,
    dotation_usd: null,
    points_gain_vainqueur: null,
    tableau: null,
    wild_card: false,
    classement_requis: null,
    site_officiel: null,
    statut: resolveCompetitionStatut(comp),
    resultat_simple: null,
    resultat_double: null,
    points_gagnes: null,
    prize_money_usd: null,
    notes_coach: null,
    billet_avion_id: null,
    hebergement_id: null,
    visa_requis: false,
    per_diem_prevu: null,
    competition_id: comp.id,
    created_by: null,
    created_at: now,
    updated_at: now,
  };
}

export function competitionToEvenements(
  comp: CompetitionRow,
  links: { joueurIds: string[]; coachIds: string[] }
): ProgrammationEvenementEnriched[] {
  const rows: ProgrammationEvenementEnriched[] = [];
  for (const joueurId of links.joueurIds) {
    rows.push(baseCompetitionEvent(comp, joueurId, joueurId, `j:${joueurId}`));
  }
  for (const coachId of links.coachIds) {
    rows.push(baseCompetitionEvent(comp, `coach-${coachId}`, coachId, `c:${coachId}`));
  }
  return rows;
}

/**
 * Fusionne les compétitions officielles dans la liste d'événements planning.
 * Évite les doublons si un événement de programmation référence déjà cette
 * compétition (via `competition_id`) pour le même joueur.
 */
export function mergeProgrammationWithCompetitions(
  evenements: ProgrammationEvenementEnriched[],
  competitions: CompetitionRow[],
  participants: CompetitionParticipantRow[],
  filters?: { dateDebut?: string; dateFin?: string; joueurId?: string; joueurIds?: string[] }
): ProgrammationEvenementEnriched[] {
  const joueursByComp = new Map<string, string[]>();
  const coachsByComp = new Map<string, string[]>();
  for (const p of participants) {
    if (p.participant_type === "joueur") {
      const arr = joueursByComp.get(p.competition_id) ?? [];
      arr.push(p.participant_id);
      joueursByComp.set(p.competition_id, arr);
    } else if (p.participant_type === "coach") {
      const arr = coachsByComp.get(p.competition_id) ?? [];
      arr.push(p.participant_id);
      coachsByComp.set(p.competition_id, arr);
    }
  }

  const allowedJoueurIds = filters?.joueurId
    ? new Set([filters.joueurId])
    : filters?.joueurIds?.length
      ? new Set(filters.joueurIds)
      : null;

  const virtual: ProgrammationEvenementEnriched[] = [];

  for (const comp of competitions) {
    if (!competitionOverlapsRange(comp, filters?.dateDebut, filters?.dateFin)) continue;

    let joueurIds = [...new Set(joueursByComp.get(comp.id) ?? [])];
    let coachIds = [...new Set(coachsByComp.get(comp.id) ?? [])];

    if (allowedJoueurIds) {
      joueurIds = joueurIds.filter((id) => allowedJoueurIds.has(id));
    }

    joueurIds = joueurIds.filter(
      (id) => !evenements.some((e) => e.joueur_id === id && e.competition_id === comp.id)
    );

    if (!joueurIds.length && !coachIds.length) continue;

    virtual.push(...competitionToEvenements(comp, { joueurIds, coachIds }));
  }

  return [...evenements, ...virtual].sort((a, b) =>
    a.date_debut.localeCompare(b.date_debut)
  );
}
