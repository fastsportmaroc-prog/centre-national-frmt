import { getAdminDocumentAlertStats } from "@/lib/data/admin-documents";
import type { AdminDocumentAlertStats } from "@/lib/types/admin-document";
import {
  getBilletsAvion,
  getHebergements,
  getJoueurs,
  getOccupationPourcentage,
  getReservationsEnriched,
  getRestaurations,
  getStageIdsWithFosAgriDocuments,
  getStageIdsWithTerrainReservations,
  getStages,
  getStageCoachLinks,
  getStageJoueursLinks,
} from "@/lib/supabase/queries";
import type { StageProgrammeV2 } from "@/lib/types/v2";
import { billetPrixEnMad } from "@/lib/v2/billets-currency";
import { detectConflicts } from "@/lib/v2/reservations-utils";
import {
  hasTerrainsInNotes,
  stageHasTerrainsConfigured,
} from "@/lib/v2/stage-terrain-status";
import { differenceInCalendarDays, format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

export type StageDashboardCard = StageProgrammeV2 & {
  nb_joueurs: number;
  nb_coachs: number;
  has_hebergement: boolean;
  has_restauration: boolean;
  has_terrains: boolean;
  has_fos_agri: boolean;
  has_billets: boolean;
  checklist_done: number;
  checklist_total: number;
  jours_duree: number;
  jours_avant: number;
};

export type DashboardAlertLevel = "urgent" | "attention" | "info";

export type DashboardAlert = {
  level: DashboardAlertLevel;
  message: string;
  href?: string;
};

export type WeekTimelineDay = {
  date: string;
  label: string;
  stages: { id: string; nom: string; categorie: string; enCours: boolean }[];
};

export type DashboardV2Data = {
  stagesAvenir: StageDashboardCard[];
  nbStagesAvenir: number;
  nbJoueurs: number;
  occupationMax: number;
  alertes: DashboardAlert[];
  alertesByLevel: Record<DashboardAlertLevel, DashboardAlert[]>;
  occupation: Awaited<ReturnType<typeof getOccupationPourcentage>>;
  kpiLogistique: {
    chambresOccupees: number;
    repasPrevus: number;
    billetsEnAttente: number;
    madAPayer: number;
  };
  weekTimeline: WeekTimelineDay[];
  prochainStage: { nom: string; jours: number } | null;
  navBadges: Record<string, number>;
  passportVisaStats: AdminDocumentAlertStats;
};

function stageNeedsTerrains(s: StageProgrammeV2): boolean {
  return Boolean(s.terrains) || hasTerrainsInNotes(s.notes);
}

function checklistProgress(s: StageDashboardCard & { hebergement: boolean; transport_avion?: boolean }) {
  const tasks = [
    s.nb_joueurs > 0,
    s.nb_coachs > 0,
    !s.hebergement || s.has_hebergement,
    s.has_restauration,
    !stageNeedsTerrains(s) || s.has_terrains,
    !s.transport_avion || s.has_billets,
    s.statut === "confirme",
    !!s.lieu?.trim(),
    s.date_debut >= new Date().toISOString().slice(0, 10) || s.statut === "termine",
    s.nb_joueurs + s.nb_coachs >= 2,
  ];
  return { done: tasks.filter(Boolean).length, total: tasks.length };
}

function effectiveStageStatut(s: StageProgrammeV2, today: string): StageProgrammeV2["statut"] {
  // Règle métier demandée: si la date est dépassée et que ce n'est pas annulé => terminé.
  if (s.statut !== "annule" && s.date_fin < today) return "termine";
  return s.statut;
}

function buildLinkCountMaps(
  linksJ: Awaited<ReturnType<typeof getStageJoueursLinks>>,
  linksC: Awaited<ReturnType<typeof getStageCoachLinks>>
) {
  const joueursByStage = new Map<string, number>();
  const coachsByStage = new Map<string, number>();
  for (const l of linksJ) {
    joueursByStage.set(l.stage_id, (joueursByStage.get(l.stage_id) ?? 0) + 1);
  }
  for (const l of linksC) {
    coachsByStage.set(l.stage_id, (coachsByStage.get(l.stage_id) ?? 0) + 1);
  }
  return { joueursByStage, coachsByStage };
}

function enrichStage(
  s: StageProgrammeV2,
  joueursByStage: Map<string, number>,
  coachsByStage: Map<string, number>,
  hebByStage: Set<string>,
  restByStage: Set<string>,
  billetsByStage: Set<string>,
  terrResaCountByStage: Map<string, number>,
  terrainStageIds: Set<string>,
  fosAgriByStage: Set<string>
): StageDashboardCard {
  const today = new Date().toISOString().slice(0, 10);
  const start = parseISO(s.date_debut.includes("T") ? s.date_debut : `${s.date_debut}T12:00:00`);
  const end = parseISO(s.date_fin.includes("T") ? s.date_fin : `${s.date_fin}T12:00:00`);
  const jours_duree = Math.max(1, differenceInCalendarDays(end, start) + 1);
  const jours_avant = differenceInCalendarDays(start, new Date());
  const statut = effectiveStageStatut(s, today);

  const base = {
    ...s,
    statut,
    nb_joueurs: joueursByStage.get(s.id) ?? 0,
    nb_coachs: coachsByStage.get(s.id) ?? 0,
    has_hebergement: hebByStage.has(s.id) || s.hebergement,
    has_restauration: restByStage.has(s.id),
    has_terrains:
      terrainStageIds.has(s.id) ||
      stageHasTerrainsConfigured({
        id: s.id,
        terrains: s.terrains,
        notes: s.notes,
        terrainReservationCount: terrResaCountByStage.get(s.id) ?? 0,
      }),
    has_fos_agri: fosAgriByStage.has(s.id),
    has_billets: billetsByStage.has(s.id),
    jours_duree,
    jours_avant,
    checklist_done: 0,
    checklist_total: 10,
  };
  const chk = checklistProgress(base);
  return { ...base, checklist_done: chk.done, checklist_total: chk.total };
}

export async function loadDashboardV2(): Promise<DashboardV2Data> {
  const today = new Date().toISOString().slice(0, 10);
  const [
    stages,
    joueurs,
    hebergements,
    restaurations,
    billets,
    linksJ,
    linksC,
    occupation,
    reservations,
    passportVisaStats,
    terrainStageIds,
    fosAgriStageIds,
  ] = await Promise.all([
      getStages(),
      getJoueurs(),
      getHebergements(),
      getRestaurations(),
      getBilletsAvion(),
      getStageJoueursLinks(),
      getStageCoachLinks(),
      getOccupationPourcentage(),
      getReservationsEnriched(),
      getAdminDocumentAlertStats(),
      getStageIdsWithTerrainReservations(),
      getStageIdsWithFosAgriDocuments(),
    ]);

  const hebByStage = new Set(hebergements.map((h) => h.stage_id));
  const restByStage = new Set(restaurations.map((r) => r.stage_id));
  const billetsByStage = new Set(billets.map((b) => b.stage_id));
  const { joueursByStage, coachsByStage } = buildLinkCountMaps(linksJ, linksC);

  const terrResaCountByStage = new Map<string, number>();
  for (const id of terrainStageIds) {
    terrResaCountByStage.set(id, Math.max(terrResaCountByStage.get(id) ?? 0, 1));
  }
  for (const r of reservations) {
    if (!r.stage_id) continue;
    terrResaCountByStage.set(r.stage_id, (terrResaCountByStage.get(r.stage_id) ?? 0) + 1);
  }

  const stagesWithEffectiveStatut = stages.map((s) => ({
    ...s,
    statut: effectiveStageStatut(s, today),
  }));

  const stagesAvenir = stagesWithEffectiveStatut
    .filter((s) => s.date_fin >= today && s.statut !== "annule")
    .map((s) =>
      enrichStage(
        s,
        joueursByStage,
        coachsByStage,
        hebByStage,
        restByStage,
        billetsByStage,
        terrResaCountByStage,
        terrainStageIds,
        fosAgriStageIds
      )
    )
    .sort((a, b) => a.date_debut.localeCompare(b.date_debut));

  const alertes: DashboardAlert[] = [];
  for (const s of stagesAvenir) {
    const days = s.jours_avant;
    if (days >= 0 && days < 7) {
      alertes.push({
        level: days < 3 ? "urgent" : "attention",
        message: `Stage « ${s.stage_action} » dans ${days} jour${days > 1 ? "s" : ""}`,
        href: "/v2/stages",
      });
    }
    if (stageNeedsTerrains(s) && !s.has_terrains && s.statut === "prevu") {
      alertes.push({
        level: "attention",
        message: `Stage « ${s.stage_action} » sans terrain réservé`,
        href: "/v2/reservations",
      });
    }
    if (s.hebergement && !s.has_hebergement) {
      alertes.push({
        level: "urgent",
        message: `Stage ${s.categorie} — Hébergement non confirmé (dans ${Math.max(0, days)}j)`,
        href: "/v2/hebergement",
      });
    }
    if (!s.has_restauration && s.statut !== "annule") {
      alertes.push({
        level: "attention",
        message: `Stage « ${s.stage_action} » — Restauration non confirmée`,
        href: "/v2/restauration",
      });
    }
    if (s.nb_coachs === 0) {
      alertes.push({
        level: "attention",
        message: `Entraîneur manquant — ${s.stage_action}`,
        href: "/v2/stages",
      });
    }
    if (s.has_billets && billets.some((b) => b.stage_id === s.id && b.statut === "demande")) {
      alertes.push({
        level: "attention",
        message: `Billets en attente — ${s.stage_action}`,
        href: "/v2/billets-avion",
      });
    }
  }

  const conflictCount = detectConflicts(reservations).size;
  if (conflictCount > 0) {
    alertes.push({
      level: "urgent",
      message: `${conflictCount} conflit(s) de court détecté(s)`,
      href: "/v2/reservations",
    });
  }

  const stagesThisWeek = stagesAvenir.filter((s) => s.jours_avant >= 0 && s.jours_avant <= 7);
  if (stagesThisWeek.length > 0) {
    alertes.push({
      level: "info",
      message: `${stagesThisWeek.length} stage(s) commencent cette semaine`,
      href: "/v2/calendrier",
    });
  }

  const alertesByLevel: Record<DashboardAlertLevel, DashboardAlert[]> = {
    urgent: alertes.filter((a) => a.level === "urgent").slice(0, 5),
    attention: alertes.filter((a) => a.level === "attention").slice(0, 6),
    info: alertes.filter((a) => a.level === "info").slice(0, 4),
  };

  const chambresOccupees = hebergements.reduce(
    (sum, h) => sum + (h.nb_chambres_joueurs ?? 0) + (h.nb_chambres_coachs ?? 0) + (h.chambres ?? 0),
    0
  );
  const repasPrevus = restaurations.reduce((sum, r) => sum + (r.total_repas ?? 0), 0);
  const billetsEnAttente = billets.filter((b) => b.statut === "demande").length;
  const madAPayer = billets
    .filter((b) => b.statut === "demande")
    .reduce((sum, b) => sum + billetPrixEnMad(b.prix_unitaire, b.devise), 0);

  const weekTimeline: WeekTimelineDay[] = [];
  const now = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    const iso = format(d, "yyyy-MM-dd");
    const dayStages = stagesWithEffectiveStatut.filter(
      (s) => s.date_debut <= iso && s.date_fin >= iso && s.statut !== "annule"
    );
    weekTimeline.push({
      date: iso,
      label: format(d, "EEE dd/MM", { locale: fr }),
      stages: dayStages.map((s) => ({
        id: s.id,
        nom: s.stage_action,
        categorie: s.categorie,
        enCours: s.date_debut <= today && s.date_fin >= today,
      })),
    });
  }

  const prochain = stagesAvenir.find((s) => s.jours_avant >= 0);
  const prochainStage = prochain
    ? { nom: prochain.stage_action, jours: prochain.jours_avant }
    : null;

  const navBadges: Record<string, number> = {
    "/v2/hebergement": alertes.filter((a) =>
      a.message.toLowerCase().includes("hébergement")
    ).length,
    "/v2/billets-avion": billetsEnAttente,
    "/v2/rapports": alertesByLevel.info.some((a) => a.message.includes("rapport")) ? 1 : 0,
  };

  const occupationMax = occupation.length ? Math.max(...occupation.map((o) => o.pct)) : 0;

  return {
    stagesAvenir,
    nbStagesAvenir: stagesAvenir.length,
    nbJoueurs: joueurs.length,
    occupationMax,
    alertes: alertes.slice(0, 12),
    alertesByLevel,
    occupation,
    kpiLogistique: {
      chambresOccupees,
      repasPrevus,
      billetsEnAttente,
      madAPayer: Math.round(madAPayer),
    },
    weekTimeline,
    prochainStage,
    navBadges,
    passportVisaStats,
  };
}

/** Tous les stages enrichis (page Stages, filtres complets). */
export async function loadAllStageCards(): Promise<StageDashboardCard[]> {
  const [stages, hebergements, restaurations, billets, linksJ, linksC, reservations, terrainStageIds, fosAgriStageIds] =
    await Promise.all([
      getStages(),
      getHebergements(),
      getRestaurations(),
      getBilletsAvion(),
      getStageJoueursLinks(),
      getStageCoachLinks(),
      getReservationsEnriched(),
      getStageIdsWithTerrainReservations(),
      getStageIdsWithFosAgriDocuments(),
    ]);

  const hebByStage = new Set(hebergements.map((h) => h.stage_id));
  const restByStage = new Set(restaurations.map((r) => r.stage_id));
  const billetsByStage = new Set(billets.map((b) => b.stage_id));

  const terrResaCountByStage = new Map<string, number>();
  for (const id of terrainStageIds) {
    terrResaCountByStage.set(id, Math.max(terrResaCountByStage.get(id) ?? 0, 1));
  }
  for (const r of reservations) {
    if (!r.stage_id) continue;
    terrResaCountByStage.set(r.stage_id, (terrResaCountByStage.get(r.stage_id) ?? 0) + 1);
  }

  const { joueursByStage, coachsByStage } = buildLinkCountMaps(linksJ, linksC);

  return stages
    .map((s) =>
      enrichStage(
        s,
        joueursByStage,
        coachsByStage,
        hebByStage,
        restByStage,
        billetsByStage,
        terrResaCountByStage,
        terrainStageIds,
        fosAgriStageIds
      )
    )
    .sort((a, b) => a.date_debut.localeCompare(b.date_debut));
}