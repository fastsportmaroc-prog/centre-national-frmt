import { getJoueurs } from "@/lib/data/joueurs";
import {
  getDaysUntilStage,
  getStageProvisionSummaries,
  getStagesProchainsAvecAlertes,
} from "@/lib/data/stage-besoins";
import { getReservationsInfrastructure } from "@/lib/data/reservation-infra";
import { getStagesProgramme } from "@/lib/data/stages";
import { parseLogistiqueFromNotes } from "@/lib/stages/stage-logistique-serializer";
import type { StageProgramme } from "@/lib/types/stages";

export type StageStatutVisuel = "prevu" | "confirme" | "imminent" | "annule";

export type DashboardStageCard = {
  stage: StageProgramme;
  joueurs: number;
  coachs: number;
  hebergement: boolean;
  restauration: boolean;
  terrains: boolean;
  statutVisuel: StageStatutVisuel;
  joursAvantDebut: number;
};

export type DashboardAlerte = {
  id: string;
  level: "error" | "warn";
  message: string;
  stage_id: string;
  stage_label: string;
  href: string;
};

export type DashboardKpis = {
  stagesAvenir: number;
  joueursActifsConcernes: number;
  courtsUtilisesSemaine: number;
  alertesActives: number;
};

export type DashboardStageBundle = {
  stagesAvenir: DashboardStageCard[];
  kpis: DashboardKpis;
  alertes: DashboardAlerte[];
};

function flagsFromStage(stage: StageProgramme) {
  const pack = parseLogistiqueFromNotes(stage.notes);
  return {
    joueurs:
      pack?.joueur_ids.length ??
      (stage.nombre_joueurs > 0 ? stage.nombre_joueurs : 0),
    coachs:
      pack?.entraineur_ids.length ??
      (stage.nombre_encadrants > 0 ? stage.nombre_encadrants : 0),
    hebergement: !!(pack?.hebergement?.actif || stage.hebergement),
    restauration: !!pack?.restauration?.actif,
    terrains: !!(pack?.terrains?.actif || stage.infrastructure_ids.length > 0),
  };
}

export function statutVisuelStage(stage: StageProgramme): StageStatutVisuel {
  if (stage.statut === "annule") return "annule";
  if (stage.statut === "confirme" || stage.statut === "en_cours") return "confirme";
  const j = getDaysUntilStage(stage);
  if (j >= 0 && j < 7) return "imminent";
  return "prevu";
}

function weekRange(): { start: string; end: string } {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const mon = new Date(now);
  mon.setDate(now.getDate() + diff);
  mon.setHours(0, 0, 0, 0);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  return {
    start: mon.toISOString().slice(0, 10),
    end: sun.toISOString().slice(0, 10),
  };
}

function reservationInRange(dateIso: string, start: string, end: string): boolean {
  const d = dateIso.slice(0, 10);
  return d >= start && d <= end;
}

export async function getDashboardStageBundle(): Promise<DashboardStageBundle> {
  const today = new Date().toISOString().slice(0, 10);
  const [summaries, alertesRaw, reservations, joueurs] = await Promise.all([
    getStageProvisionSummaries(),
    getStagesProchainsAvecAlertes(50),
    getReservationsInfrastructure(),
    getJoueurs(),
  ]);

  const upcoming = summaries
    .map((s) => s.stage)
    .filter((s) => s.date_fin >= today && s.statut !== "annule")
    .sort((a, b) => a.date_debut.localeCompare(b.date_debut));

  const stagesAvenir: DashboardStageCard[] = upcoming.map((stage) => {
    const f = flagsFromStage(stage);
    return {
      stage,
      ...f,
      statutVisuel: statutVisuelStage(stage),
      joursAvantDebut: getDaysUntilStage(stage),
    };
  });

  const joueurIds = new Set<string>();
  for (const card of stagesAvenir) {
    const pack = parseLogistiqueFromNotes(card.stage.notes);
    for (const id of pack?.joueur_ids ?? []) joueurIds.add(id);
  }
  const joueursActifsConcernes =
    joueurIds.size > 0
      ? joueurIds.size
      : joueurs.filter((j) => j.statut === "actif").length > 0
        ? stagesAvenir.reduce((s, c) => s + c.joueurs, 0)
        : 0;

  const { start, end } = weekRange();
  const courtsSemaine = new Set(
    reservations
      .filter(
        (r) =>
          r.statut !== "annulee" &&
          r.stage_id &&
          reservationInRange(r.date_debut, start, end)
      )
      .map((r) => r.infrastructure_id)
  ).size;

  const alertes: DashboardAlerte[] = [];

  for (const { stage, alertes: msgs } of alertesRaw) {
    for (const msg of msgs) {
      let level: DashboardAlerte["level"] = "warn";
      if (
        msg.includes("Conflit") ||
        msg.includes("sans terrain") ||
        msg.includes("Aucune réservation")
      ) {
        level = "error";
      }
      alertes.push({
        id: `${stage.id}-${msg.slice(0, 30)}`,
        level,
        message: msg,
        stage_id: stage.id,
        stage_label: stage.stage_action,
        href: `/stages/${stage.id}`,
      });
    }

    const pack = parseLogistiqueFromNotes(stage.notes);
    const summary = summaries.find((s) => s.stage.id === stage.id);

    if (pack?.terrains?.actif && (summary?.reservations.length ?? 0) === 0) {
      alertes.push({
        id: `no-terrain-${stage.id}`,
        level: "error",
        message: "Stage sans terrain affecté",
        stage_id: stage.id,
        stage_label: stage.stage_action,
        href: `/stages/${stage.id}`,
      });
    }

    if (pack?.hebergement?.actif && stage.statut === "prevu") {
      alertes.push({
        id: `heb-nc-${stage.id}`,
        level: "warn",
        message: "Hébergement non confirmé",
        stage_id: stage.id,
        stage_label: stage.stage_action,
        href: `/stages/${stage.id}`,
      });
    }

    if (
      pack?.restauration?.actif &&
      summary?.besoins_restauration.some((b) => b.statut === "planifie")
    ) {
      alertes.push({
        id: `resto-nc-${stage.id}`,
        level: "warn",
        message: "Restauration non confirmée",
        stage_id: stage.id,
        stage_label: stage.stage_action,
        href: `/restauration`,
      });
    }

    if (pack?.entraineur_ids.length === 0 && stage.entraineur_ids.length === 0) {
      alertes.push({
        id: `coach-${stage.id}`,
        level: "warn",
        message: "Coach manquant sur le stage",
        stage_id: stage.id,
        stage_label: stage.stage_action,
        href: `/stages/${stage.id}`,
      });
    }

    const j = getDaysUntilStage(stage);
    if (j >= 0 && j < 7 && stage.statut === "prevu") {
      alertes.push({
        id: `soon-${stage.id}`,
        level: "warn",
        message: `Stage dans moins de 7 jours sans confirmation`,
        stage_id: stage.id,
        stage_label: stage.stage_action,
        href: `/stages/${stage.id}`,
      });
    }

    if ((summary?.conflits.length ?? 0) > 0) {
      alertes.push({
        id: `conflict-${stage.id}`,
        level: "error",
        message: `Conflit court : ${summary!.conflits[0]}`,
        stage_id: stage.id,
        stage_label: stage.stage_action,
        href: `/infrastructures`,
      });
    }
  }

  const uniqueAlertes = alertes.filter(
    (a, i, arr) => arr.findIndex((x) => x.id === a.id) === i
  );

  return {
    stagesAvenir,
    kpis: {
      stagesAvenir: stagesAvenir.length,
      joueursActifsConcernes,
      courtsUtilisesSemaine: courtsSemaine,
      alertesActives: uniqueAlertes.length,
    },
    alertes: uniqueAlertes,
  };
}

export async function getAllStagesForSelect(): Promise<StageProgramme[]> {
  const stages = await getStagesProgramme();
  return stages.sort((a, b) => b.date_debut.localeCompare(a.date_debut));
}
