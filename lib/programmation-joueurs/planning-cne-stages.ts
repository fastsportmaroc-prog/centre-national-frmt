import type {
  ProgrammationEvenementEnriched,
  ProgrammationStatut,
  ProgrammationType,
} from "@/lib/types/programmation-joueurs";
import type { StageProgrammeV2 } from "@/lib/types/v2";

export const CNE_STAGE_EVENT_PREFIX = "cne-stage:";

export type StageProgrammeLink = {
  stage_id: string;
  joueur_id?: string;
  coach_id?: string;
};

export function isStageProgrammeVirtualEvent(ev: ProgrammationEvenementEnriched): boolean {
  return Boolean(ev.stage_programme_id) || ev.id.startsWith(CNE_STAGE_EVENT_PREFIX);
}

export function planningCneColumnId(ev: ProgrammationEvenementEnriched): string {
  return ev.cne_column_id ?? ev.joueur_id;
}

function isStageProgrammationType(type: ProgrammationType): boolean {
  return type === "stage_national" || type === "stage_etranger";
}

function rangesOverlap(startA: string, endA: string, startB: string, endB: string): boolean {
  const a0 = startA.slice(0, 10);
  const a1 = endA.slice(0, 10);
  const b0 = startB.slice(0, 10);
  const b1 = endB.slice(0, 10);
  return a0 <= b1 && b0 <= a1;
}

function stageOverlapsRange(stage: StageProgrammeV2, dateDebut?: string, dateFin?: string): boolean {
  if (!dateDebut && !dateFin) return true;
  const s0 = stage.date_debut.slice(0, 10);
  const s1 = stage.date_fin.slice(0, 10);
  const f0 = dateDebut?.slice(0, 10) ?? "0000-01-01";
  const f1 = dateFin?.slice(0, 10) ?? "9999-12-31";
  return rangesOverlap(s0, s1, f0, f1);
}

function resolveStageStatut(stage: StageProgrammeV2): ProgrammationStatut {
  const today = new Date().toISOString().slice(0, 10);
  if (stage.statut === "annule") return "termine";
  if (stage.statut === "termine" || stage.date_fin < today) return "termine";
  if (stage.date_debut <= today && stage.date_fin >= today) return "en_cours";
  if (stage.statut === "confirme" && stage.date_debut <= today) return "en_cours";
  return "a_venir";
}

export function stageProgrammationType(stage: StageProgrammeV2): ProgrammationType {
  const src = (stage.source ?? "FRMT").toUpperCase();
  const lieu = (stage.lieu ?? "").toLowerCase();
  const atCne =
    lieu.includes("centre national") || lieu.includes("rabat") || src === "FRMT";
  return atCne ? "stage_national" : "stage_etranger";
}

function hasProgrammationStageOverlap(
  evenements: ProgrammationEvenementEnriched[],
  joueurId: string,
  stage: StageProgrammeV2
): boolean {
  return evenements.some(
    (e) =>
      e.joueur_id === joueurId &&
      isStageProgrammationType(e.type) &&
      rangesOverlap(e.date_debut, e.date_fin, stage.date_debut, stage.date_fin)
  );
}

function hasCoachStageOverlap(
  evenements: ProgrammationEvenementEnriched[],
  coachColumnId: string,
  stage: StageProgrammeV2
): boolean {
  return evenements.some(
    (e) =>
      planningCneColumnId(e) === coachColumnId &&
      isStageProgrammationType(e.type) &&
      rangesOverlap(e.date_debut, e.date_fin, stage.date_debut, stage.date_fin)
  );
}

export function stageProgrammeToEvenements(
  stage: StageProgrammeV2,
  links: { joueurIds: string[]; coachIds: string[] }
): ProgrammationEvenementEnriched[] {
  if (stage.statut === "annule") return [];

  const nom = stage.stage_action.trim();
  const ville = stage.lieu?.trim() || null;
  const type = stageProgrammationType(stage);
  const statut = resolveStageStatut(stage);
  const t = stage.updated_at ?? stage.created_at ?? new Date().toISOString();

  const rows: ProgrammationEvenementEnriched[] = [];

  for (const joueurId of links.joueurIds) {
    rows.push({
      id: `${CNE_STAGE_EVENT_PREFIX}${stage.id}:j:${joueurId}`,
      joueur_id: joueurId,
      cne_column_id: joueurId,
      stage_programme_id: stage.id,
      type,
      nom,
      pays: null,
      ville,
      date_debut: stage.date_debut.slice(0, 10),
      date_fin: stage.date_fin.slice(0, 10),
      surface: null,
      altitude: null,
      categorie_tournoi: stage.categorie,
      dotation_usd: null,
      points_gain_vainqueur: null,
      tableau: null,
      wild_card: false,
      classement_requis: null,
      site_officiel: null,
      statut,
      resultat_simple: null,
      resultat_double: null,
      points_gagnes: null,
      prize_money_usd: null,
      notes_coach: stage.notes,
      billet_avion_id: null,
      hebergement_id: null,
      visa_requis: false,
      per_diem_prevu: null,
      competition_id: null,
      created_by: null,
      created_at: t,
      updated_at: t,
    });
  }

  for (const coachId of links.coachIds) {
    const columnId = `coach-${coachId}`;
    rows.push({
      id: `${CNE_STAGE_EVENT_PREFIX}${stage.id}:c:${coachId}`,
      joueur_id: coachId,
      cne_column_id: columnId,
      stage_programme_id: stage.id,
      type,
      nom,
      pays: null,
      ville,
      date_debut: stage.date_debut.slice(0, 10),
      date_fin: stage.date_fin.slice(0, 10),
      surface: null,
      altitude: null,
      categorie_tournoi: stage.categorie,
      dotation_usd: null,
      points_gain_vainqueur: null,
      tableau: null,
      wild_card: false,
      classement_requis: null,
      site_officiel: null,
      statut,
      resultat_simple: null,
      resultat_double: null,
      points_gagnes: null,
      prize_money_usd: null,
      notes_coach: stage.notes,
      billet_avion_id: null,
      hebergement_id: null,
      visa_requis: false,
      per_diem_prevu: null,
      competition_id: null,
      created_by: null,
      created_at: t,
      updated_at: t,
    });
  }

  return rows;
}

export function mergeProgrammationWithStageProgramme(
  evenements: ProgrammationEvenementEnriched[],
  stages: StageProgrammeV2[],
  joueurLinks: { stage_id: string; joueur_id: string }[],
  coachLinks: { stage_id: string; coach_id: string }[],
  filters?: { dateDebut?: string; dateFin?: string; joueurId?: string; joueurIds?: string[] }
): ProgrammationEvenementEnriched[] {
  const joueursByStage = new Map<string, string[]>();
  for (const l of joueurLinks) {
    const arr = joueursByStage.get(l.stage_id) ?? [];
    arr.push(l.joueur_id);
    joueursByStage.set(l.stage_id, arr);
  }

  const coachsByStage = new Map<string, string[]>();
  for (const l of coachLinks) {
    const arr = coachsByStage.get(l.stage_id) ?? [];
    arr.push(l.coach_id);
    coachsByStage.set(l.stage_id, arr);
  }

  const allowedJoueurIds = filters?.joueurId
    ? new Set([filters.joueurId])
    : filters?.joueurIds?.length
      ? new Set(filters.joueurIds)
      : null;

  const virtual: ProgrammationEvenementEnriched[] = [];

  for (const stage of stages) {
    if (!stageOverlapsRange(stage, filters?.dateDebut, filters?.dateFin)) continue;

    let joueurIds = [...new Set(joueursByStage.get(stage.id) ?? [])];
    let coachIds = [...new Set(coachsByStage.get(stage.id) ?? [])];

    if (allowedJoueurIds) {
      joueurIds = joueurIds.filter((id) => allowedJoueurIds.has(id));
      if (!joueurIds.length && !coachIds.length) continue;
    }

    joueurIds = joueurIds.filter(
      (id) => !hasProgrammationStageOverlap(evenements, id, stage)
    );
    coachIds = coachIds.filter(
      (id) => !hasCoachStageOverlap(evenements, `coach-${id}`, stage)
    );

    if (!joueurIds.length && !coachIds.length) continue;

    virtual.push(...stageProgrammeToEvenements(stage, { joueurIds, coachIds }));
  }

  return [...evenements, ...virtual].sort((a, b) =>
    a.date_debut.localeCompare(b.date_debut)
  );
}
