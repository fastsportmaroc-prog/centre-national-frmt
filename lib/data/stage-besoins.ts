import { shouldUseLocalTestStorage } from "@/lib/local-test/mode";
import { readJson } from "@/lib/local-test/storage";
import { getBesoinsRestauration } from "@/lib/data/restauration";
import { getReservationsInfrastructure } from "@/lib/data/reservation-infra";
import { getStagesProgramme } from "@/lib/data/stages";
import { parseLogistiqueFromNotes } from "@/lib/stages/stage-logistique-serializer";
import { parseStageIdFromNotes } from "@/lib/utils/stage-link";
import type { StageProgramme } from "@/lib/types/stages";
import type { BesoinRestauration } from "@/lib/types/restauration";
import type { ReservationInfrastructure } from "@/lib/types/reservation-infra";

export type StageHebergementBesoin = {
  stage_id: string;
  stage_action: string;
  date_debut: string;
  date_fin: string;
  chambres: number;
  nuitees: number;
  statut: string;
};

export type StageProvisionSummary = {
  stage: StageProgramme;
  hebergement: StageHebergementBesoin | null;
  besoins_restauration: BesoinRestauration[];
  reservations: ReservationInfrastructure[];
  conflits: string[];
};

function daysUntil(dateIso: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateIso);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

export function getDaysUntilStage(stage: StageProgramme): number {
  return daysUntil(stage.date_debut);
}

export async function getStageHebergementBesoins(): Promise<StageHebergementBesoin[]> {
  const stages = await getStagesProgramme();
  const fromStages: StageHebergementBesoin[] = stages
    .filter((s) => s.hebergement && s.chambres > 0)
    .map((s) => {
      const pack = parseLogistiqueFromNotes(s.notes);
      const d0 = new Date(`${s.date_debut.slice(0, 10)}T12:00:00`);
      const d1 = new Date(`${s.date_fin.slice(0, 10)}T12:00:00`);
      const duree = Math.max(
        1,
        Math.round((d1.getTime() - d0.getTime()) / 86400000)
      );
      return {
        stage_id: s.id,
        stage_action: s.stage_action,
        date_debut: s.date_debut,
        date_fin: s.date_fin,
        chambres: s.chambres,
        nuitees: s.chambres * duree,
        statut: s.statut,
      };
    });

  if (!shouldUseLocalTestStorage()) return fromStages;

  type LocalHeb = {
    stage_id: string;
    at: string;
    acc: { total_chambres: number; total_nuitees: number };
  };
  const local = readJson<LocalHeb[]>("hebergement_besoins", []);
  const byId = new Map(fromStages.map((h) => [h.stage_id, h]));

  for (const row of local) {
    const stage = stages.find((s) => s.id === row.stage_id);
    if (!stage) continue;
    byId.set(row.stage_id, {
      stage_id: row.stage_id,
      stage_action: stage.stage_action,
      date_debut: stage.date_debut,
      date_fin: stage.date_fin,
      chambres: row.acc.total_chambres,
      nuitees: row.acc.total_nuitees,
      statut: stage.statut,
    });
  }

  return [...byId.values()].sort((a, b) => a.date_debut.localeCompare(b.date_debut));
}

export async function getStageProvisionSummaries(): Promise<StageProvisionSummary[]> {
  const [stages, besoins, reservations] = await Promise.all([
    getStagesProgramme(),
    getBesoinsRestauration(),
    getReservationsInfrastructure(),
  ]);

  const hebergements = await getStageHebergementBesoins();
  const hebByStage = new Map(hebergements.map((h) => [h.stage_id, h]));

  return stages
    .filter(
      (s) =>
        s.hebergement ||
        besoins.some((b) => parseStageIdFromNotes(b.notes) === s.id) ||
        reservations.some((r) => r.stage_id === s.id)
    )
    .map((stage) => {
      const pack = parseLogistiqueFromNotes(stage.notes);
      return {
        stage,
        hebergement: hebByStage.get(stage.id) ?? null,
        besoins_restauration: besoins.filter(
          (b) => parseStageIdFromNotes(b.notes) === stage.id
        ),
        reservations: reservations.filter(
          (r) => r.stage_id === stage.id && r.statut !== "annulee"
        ),
        conflits: pack?.dernier_provisionnement?.conflits ?? [],
      };
    })
    .sort((a, b) => a.stage.date_debut.localeCompare(b.stage.date_debut));
}

export async function getStagesProchainsAvecAlertes(limit = 6): Promise<
  {
    stage: StageProgramme;
    alertes: string[];
  }[]
> {
  const today = new Date().toISOString().split("T")[0]!;
  const summaries = await getStageProvisionSummaries();
  const upcoming = summaries
    .filter((s) => s.stage.date_fin >= today && s.stage.statut !== "annule")
    .slice(0, limit);

  return upcoming.map(({ stage, hebergement, besoins_restauration, reservations, conflits }) => {
    const alertes: string[] = [];
    const jours = getDaysUntilStage(stage);

    if (jours >= 0 && jours < 7 && stage.statut === "prevu") {
      alertes.push(`Début dans ${jours} jour(s) — statut encore « prévu »`);
    }

    const pack = parseLogistiqueFromNotes(stage.notes);
    if (pack?.terrains?.actif && reservations.length === 0) {
      alertes.push("Aucune réservation terrain provisionnée");
    }
    if (pack?.hebergement?.actif && !hebergement) {
      alertes.push("Hébergement activé mais non provisionné");
    }
    if (pack?.restauration?.actif && besoins_restauration.length === 0) {
      alertes.push("Restauration activée sans besoin créé");
    }
    if (
      pack?.restauration?.actif &&
      besoins_restauration.some((b) => b.statut === "planifie")
    ) {
      alertes.push("Restauration non confirmée (statut planifié)");
    }
    if (conflits.length > 0) {
      alertes.push(`Conflit terrains : ${conflits[0]}`);
    }

    return { stage, alertes };
  });
}
