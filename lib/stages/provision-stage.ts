import { logHistorique } from "@/lib/audit/historique";

import { getInfrastructures, addInfrastructureUsage } from "@/lib/data/infrastructures";

import { createReservationInfrastructure, getReservationsInfrastructure } from "@/lib/data/reservation-infra";

import {

  createPlanningEntry,

  createStageHebergement,

  createStageRestauration,

  getStageHebergements,

  getStageRestaurations,

  getPlanningEntries,

} from "@/lib/data/stage-services";

import {

  getStageById,

  updateStageProgramme,

} from "@/lib/data/stages";

import {

  linkCoachsToStage,

  linkJoueursToStage,

} from "@/lib/data/stage-relations";

import type { StageProgramme } from "@/lib/types/stages";

import type { StageLogistiquePack, StageProvisionnementResult } from "@/lib/types/stage-logistique";

import {

  assignCourtsAutomatically,

  calculateAccommodationNeeds,

  calculateMealNeeds,

  calculateStageDuration,

  calculateStageParticipants,

  creneauHoraires,

  detectCourtConflicts,

  generateStageCalendarEntries,

} from "@/lib/stages/stage-calculations";

import {

  embedLogistiqueInNotes,

  parseLogistiqueFromNotes,

  stripLogistiqueFromNotes,

} from "@/lib/stages/stage-logistique-serializer";

import { shouldUseLocalTestStorage } from "@/lib/local-test/mode";

import { provisionStageLocal } from "@/lib/local-test/provision-local";



export type ProvisionStageOptions = {

  strictCourts?: boolean;

};



async function runStep(

  label: string,

  erreurs: string[],

  fn: () => Promise<void>

): Promise<void> {

  try {

    await fn();

  } catch (e) {

    const msg = e instanceof Error ? e.message : String(e);

    console.warn(`[Provision] ${label}:`, msg);

    erreurs.push(`${label}: ${msg}`);

  }

}



/**

 * Provisionne hébergement, restauration, planning, réservations et liaisons après création stage.

 * Étapes A–G exécutées en ordre ; les erreurs sont journalisées sans interrompre la suite.

 */

export async function provisionStageAfterCreate(

  stageId: string,

  pack: StageLogistiquePack,

  options: ProvisionStageOptions = { strictCourts: true }

): Promise<StageProvisionnementResult> {

  if (shouldUseLocalTestStorage()) {

    return provisionStageLocal(stageId, pack);

  }



  return provisionStageSupabase(stageId, pack, options);

}



async function provisionStageSupabase(

  stageId: string,

  pack: StageLogistiquePack,

  options: ProvisionStageOptions

): Promise<StageProvisionnementResult> {

  const erreurs: string[] = [];

  let hebergement_cree = 0;

  let restauration_cree = 0;

  let planning_crees = 0;

  let reservations_crees = 0;

  let besoins_restauration_crees = 0;

  const alertes: string[] = [];

  const conflits: string[] = [];



  // A — Stage déjà en stages_programme

  const stage = await getStageById(stageId);

  if (!stage) {

    throw new Error("Stage introuvable dans stages_programme");

  }



  const participants = calculateStageParticipants(pack.joueur_ids, pack.entraineur_ids);

  const entraineur_ids =

    pack.entraineur_ids.length > 0 ? pack.entraineur_ids : stage.entraineur_ids;



  let chambres = stage.chambres;

  let hebergement = stage.hebergement;

  let infrastructure_ids = [...stage.infrastructure_ids];



  const [infrastructures, reservations] = await Promise.all([

    getInfrastructures(),

    getReservationsInfrastructure(),

  ]);



  // B — Hébergement

  if (pack.hebergement?.actif) {

    await runStep("Hébergement", erreurs, async () => {

      const existing = await getStageHebergements(stageId);

      if (existing.length > 0) {

        alertes.push("Hébergement déjà provisionné pour ce stage.");

        return;

      }

      const acc = calculateAccommodationNeeds(

        pack.hebergement!,

        participants.joueurs,

        participants.coachs

      );

      chambres = acc.total_chambres;

      hebergement = true;

      await createStageHebergement({

        stage_id: stageId,

        date_debut: pack.hebergement!.date_debut,

        date_fin: pack.hebergement!.date_fin,

        type_chambre_joueurs: pack.hebergement!.type_chambre_joueurs,

        type_chambre_coachs: pack.hebergement!.type_chambre_staff,

        nb_chambres_joueurs: acc.chambres_joueurs,

        nb_chambres_coachs: acc.chambres_staff,

        kitchenette: pack.hebergement!.kitchenette,

        remarques: pack.hebergement!.remarques,

        statut: "prevu",

      });

      hebergement_cree = 1;

      alertes.push(

        `Hébergement : ${acc.total_chambres} chambres, ${acc.total_nuitees} nuitées (${acc.nuits} nuits).`

      );

    });

  }



  // C — Restauration

  if (pack.restauration?.actif) {

    await runStep("Restauration", erreurs, async () => {

      const existing = await getStageRestaurations(stageId);

      if (existing.length > 0) {

        alertes.push("Restauration déjà provisionnée pour ce stage.");

        return;

      }

      const meals = calculateMealNeeds(pack.restauration!, participants.total);

      await createStageRestauration({

        stage_id: stageId,

        petit_dejeuner: pack.restauration!.petit_dejeuner,

        dejeuner: pack.restauration!.dejeuner,

        diner: pack.restauration!.diner,

        date_debut: pack.restauration!.date_debut,

        date_fin: pack.restauration!.date_fin,

        nb_personnes: participants.total,

        total_repas: meals.total_repas,

        remarques: pack.restauration!.allergies,

        statut: "prevu",

      });

      restauration_cree = 1;

      besoins_restauration_crees = 1;

      alertes.push(`Restauration : ${meals.total_repas} repas estimés.`);

    });

  }



  // D — Terrains : planning + reservations_infrastructure

  if (pack.terrains?.actif) {

    await runStep("Planning terrains", erreurs, async () => {

      const assign = assignCourtsAutomatically(

        infrastructures,

        reservations,

        pack.terrains!,

        { date_debut: stage.date_debut, date_fin: stage.date_fin },

        stageId

      );

      conflits.push(...assign.conflits);



      if (options.strictCourts && assign.conflits.length > 0) {

        throw new Error(assign.conflits[0] ?? "Conflit terrains");

      }



      const courtIds = assign.courtIds;

      infrastructure_ids = [...new Set([...infrastructure_ids, ...courtIds])];

      const entries = generateStageCalendarEntries(

        stageId,

        stage.stage_action,

        stage.date_debut,

        stage.date_fin,

        courtIds,

        pack.terrains!

      );



      const existingPlanning = await getPlanningEntries(stageId);

      const horaires = creneauHoraires(pack.terrains!.creneau, {

        debut: pack.terrains!.heure_debut,

        fin: pack.terrains!.heure_fin,

      });



      for (const entry of entries) {

        const planningExists = existingPlanning.some(

          (p) =>

            p.date === entry.date &&

            p.infrastructure_id === entry.infrastructure_id

        );

        if (!planningExists) {

          await createPlanningEntry({

            stage_id: stageId,

            date: entry.date,

            heure_debut: horaires.debut,

            heure_fin: horaires.fin,

            infrastructure_id: entry.infrastructure_id,

            surface: pack.terrains!.surface,

            coach_id: entraineur_ids[0] ?? null,

            groupe: stage.categorie,

            statut: "prevu",

          });

          planning_crees++;

        }



        if (

          detectCourtConflicts(

            reservations,

            entry.infrastructure_id,

            entry.date_debut,

            entry.date_fin,

            stageId

          )

        ) {

          conflits.push(`Court occupé le ${entry.date} (${entry.infrastructure_id})`);

          continue;

        }



        const resExists = reservations.some(

          (r) =>

            r.stage_id === stageId &&

            r.infrastructure_id === entry.infrastructure_id &&

            r.date_debut === entry.date_debut &&

            r.statut !== "annulee"

        );

        if (resExists) continue;



        await createReservationInfrastructure({

          infrastructure_id: entry.infrastructure_id,

          date_debut: entry.date_debut,

          date_fin: entry.date_fin,

          statut: "confirmee",

          joueur_id: null,

          groupe_id: null,

          stage_id: stageId,

          entraineur_id: entraineur_ids[0] ?? null,

          notes: entry.label,

        });

        reservations_crees++;

        reservations.push({

          id: `temp-${reservations_crees}`,

          infrastructure_id: entry.infrastructure_id,

          date_debut: entry.date_debut,

          date_fin: entry.date_fin,

          statut: "confirmee",

          joueur_id: null,

          groupe_id: null,

          stage_id: stageId,

          entraineur_id: entraineur_ids[0] ?? null,

          notes: entry.label,

          created_at: new Date().toISOString(),

          updated_at: new Date().toISOString(),

        });



        await addInfrastructureUsage({

          infrastructure_id: entry.infrastructure_id,

          date_debut: entry.date_debut,

          date_fin: entry.date_fin,

          module: "stages",

          reference_id: stageId,

          commentaire: stage.stage_action,

        });

      }

    });

  }



  // E — Liaison joueurs

  if (pack.joueur_ids.length > 0) {

    await runStep("Liaison joueurs", erreurs, async () => {

      await linkJoueursToStage(stageId, pack.joueur_ids);

    });

  }



  // F — Liaison coachs (entraineurs)

  if (entraineur_ids.length > 0) {

    await runStep("Liaison coachs", erreurs, async () => {

      await linkCoachsToStage(stageId, entraineur_ids);

    });

  }



  const result: StageProvisionnementResult = {

    at: new Date().toISOString(),

    reservations_crees,

    besoins_restauration_crees,

    hebergement_cree,

    restauration_cree,

    planning_crees,

    conflits,

    alertes,

    calendrier_entrees: planning_crees,

    erreurs: erreurs.length > 0 ? erreurs : undefined,

  };



  await persistPack(stage, pack, result, {

    nombre_joueurs: participants.joueurs,

    nombre_encadrants: participants.coachs,

    chambres,

    hebergement,

    entraineur_ids,

    infrastructure_ids,

  });



  // G — Historique stage_created avec payload complet

  await runStep("Historique", erreurs, async () => {

    await logHistorique({

      action: "stage_created",

      module: "stages",

      entite_id: stageId,

      entite_label: stage.stage_action,

      ancienne_valeur: null,

      nouvelle_valeur: JSON.stringify({

        pack,

        result,

        participants,

      }).slice(0, 4000),

      commentaire: [

        `${participants.total} participants`,

        hebergement_cree ? "hébergement" : null,

        restauration_cree ? "restauration" : null,

        planning_crees ? `${planning_crees} planning` : null,

        reservations_crees ? `${reservations_crees} résa terrains` : null,

      ]

        .filter(Boolean)

        .join(" · "),

    });

  });



  return result;

}



async function persistPack(

  stage: StageProgramme,

  pack: StageLogistiquePack,

  result: StageProvisionnementResult,

  patch: {

    nombre_joueurs: number;

    nombre_encadrants: number;

    chambres: number;

    hebergement: boolean;

    entraineur_ids: string[];

    infrastructure_ids: string[];

  }

) {

  const packWithResult: StageLogistiquePack = {

    ...pack,

    dernier_provisionnement: result,

  };

  const notes = embedLogistiqueInNotes(stripUserNotes(stage.notes), packWithResult);

  const duree = calculateStageDuration(stage.date_debut, stage.date_fin);

  const budget_estime = Math.round(

    patch.nombre_joueurs * duree * 25 +

      (pack.restauration?.actif ? result.restauration_cree * 200 : 0) +

      patch.chambres * duree * 320

  );



  await updateStageProgramme(stage.id, {

    nombre_joueurs: patch.nombre_joueurs,

    nombre_encadrants: patch.nombre_encadrants,

    chambres: patch.chambres,

    hebergement: patch.hebergement,

    entraineur_ids: patch.entraineur_ids,

    infrastructure_ids: patch.infrastructure_ids,

    notes,

    budget_prevu: stage.budget_prevu ?? budget_estime,

  });

}



function stripUserNotes(notes: string | null): string | null {

  const stripped = stripLogistiqueFromNotes(notes);

  return stripped || null;

}



export function getStageLogistique(stage: StageProgramme): StageLogistiquePack | null {

  return parseLogistiqueFromNotes(stage.notes);

}


