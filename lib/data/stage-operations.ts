import { logHistorique } from "@/lib/audit/historique";
import { createMouvementMateriel } from "@/lib/data/materiel";
import { createReservationInfrastructure } from "@/lib/data/reservation-infra";
import { getInfrastructures, addInfrastructureUsage } from "@/lib/data/infrastructures";
import { getMateriels } from "@/lib/data/materiel";
import { getReservationsInfrastructure } from "@/lib/data/reservation-infra";
import { getStageById, updateStageProgramme } from "@/lib/data/stages";
import type { StageProgramme } from "@/lib/types/stages";
import {
  detecterConflitsStage,
  stageBudgetEstime,
  stageChambresRequises,
  stageDureeJours,
  stageRepasEstimes,
  stageTotalParticipants,
} from "@/lib/utils/stage-automation";

export type StageAutomatisation = {
  duree_jours: number;
  total_participants: number;
  repas_estimes: number;
  chambres_requises: number;
  budget_estime: number;
  conflits: ReturnType<typeof detecterConflitsStage>;
};

export async function getStageAutomatisation(stageId: string): Promise<StageAutomatisation | null> {
  const stage = await getStageById(stageId);
  if (!stage) return null;
  const [infrastructures, reservations, materiels] = await Promise.all([
    getInfrastructures(),
    getReservationsInfrastructure(),
    getMateriels(),
  ]);
  return {
    duree_jours: stageDureeJours(stage),
    total_participants: stageTotalParticipants(stage),
    repas_estimes: stageRepasEstimes(stage),
    chambres_requises: stageChambresRequises(stage),
    budget_estime: stageBudgetEstime(stage, materiels),
    conflits: detecterConflitsStage(stage, infrastructures, reservations),
  };
}

/** Synchronise réservations infrastructure + mouvements matériel pour un stage */
export async function synchroniserStage(stageId: string): Promise<{
  reservations: number;
  mouvements: number;
  conflits: number;
}> {
  const stage = await getStageById(stageId);
  if (!stage) throw new Error("Stage introuvable");

  const [infrastructures, reservations, materiels] = await Promise.all([
    getInfrastructures(),
    getReservationsInfrastructure(),
    getMateriels(),
  ]);

  const conflits = detecterConflitsStage(stage, infrastructures, reservations);
  if (conflits.length > 0) {
    return { reservations: 0, mouvements: 0, conflits: conflits.length };
  }

  let reservationsCreees = 0;
  let mouvementsCrees = 0;

  const debut = `${stage.date_debut}T08:00:00`;
  const fin = `${stage.date_fin}T20:00:00`;

  for (const infraId of stage.infrastructure_ids) {
    const exists = reservations.some(
      (r) =>
        r.stage_id === stage.id &&
        r.infrastructure_id === infraId &&
        r.statut !== "annulee"
    );
    if (!exists) {
      await createReservationInfrastructure({
        infrastructure_id: infraId,
        date_debut: debut,
        date_fin: fin,
        statut: "confirmee",
        joueur_id: null,
        groupe_id: null,
        stage_id: stage.id,
        entraineur_id: stage.entraineur_ids[0] ?? null,
        notes: `Stage: ${stage.stage_action}`,
      });
      reservationsCreees++;
    }
    await addInfrastructureUsage({
      infrastructure_id: infraId,
      date_debut: debut,
      date_fin: fin,
      module: "stages",
      reference_id: stage.id,
      commentaire: stage.stage_action,
    });
  }

  for (const assign of stage.materiel_assignations) {
    const mat = materiels.find((m) => m.id === assign.materiel_id);
    if (!mat || assign.quantite <= 0) continue;
    await createMouvementMateriel({
      materiel_id: assign.materiel_id,
      stage_id: stage.id,
      type_mouvement: "affectation_stage",
      quantite: assign.quantite,
      commentaire: `Affectation stage ${stage.stage_action}`,
    });
    mouvementsCrees++;
  }

  const budget = stageBudgetEstime(stage, materiels);
  const chambres = stageChambresRequises(stage);
  await updateStageProgramme(stage.id, {
    budget_prevu: stage.budget_prevu ?? budget,
    chambres: stage.hebergement ? Math.max(stage.chambres, chambres) : stage.chambres,
  });

  await logHistorique({
    action: "modification",
    module: "stages",
    entite_id: stage.id,
    entite_label: stage.stage_action,
    ancienne_valeur: null,
    nouvelle_valeur: `Sync: ${reservationsCreees} résa, ${mouvementsCrees} mat.`,
    commentaire: `Budget estimé ${budget} MAD`,
  });

  return {
    reservations: reservationsCreees,
    mouvements: mouvementsCrees,
    conflits: 0,
  };
}

export function enrichirStageDefaults(
  input: Partial<StageProgramme>
): Partial<StageProgramme> {
  return {
    statut: input.statut ?? "prevu",
    infrastructure_ids: input.infrastructure_ids ?? [],
    entraineur_ids: input.entraineur_ids ?? [],
    materiel_assignations: input.materiel_assignations ?? [],
  };
}
