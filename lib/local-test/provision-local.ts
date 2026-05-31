import type { StageLogistiquePack, StageProvisionnementResult } from "@/lib/types/stage-logistique";
import type { BesoinRestauration, BesoinRestaurationInput } from "@/lib/types/restauration";
import type { ReservationInfrastructure, ReservationInfrastructureInput } from "@/lib/types/reservation-infra";
import type { HistoriqueInput } from "@/lib/types/historique";
import {
  assignCourtsAutomatically,
  calculateAccommodationNeeds,
  calculateMealNeeds,
  calculateStageDuration,
  calculateStageParticipants,
  generateStageCalendarEntries,
} from "@/lib/stages/stage-calculations";
import { embedLogistiqueInNotes, stripLogistiqueFromNotes } from "@/lib/stages/stage-logistique-serializer";
import { localGetStageById, localUpdateStageProgramme } from "./stages-store";
import { readJson, writeJson, newLocalId } from "./storage";
import { getDefaultInfrastructures, ensureLocalSeedData } from "./seed";

function logLocalHistorique(input: Omit<HistoriqueInput, "utilisateur_nom" | "utilisateur_role">) {
  const entries = readJson<
    (HistoriqueInput & { id: string; created_at: string })[]
  >("historique", []);
  entries.unshift({
    ...input,
    utilisateur_nom: "Mode local test",
    utilisateur_role: "admin",
    id: newLocalId(),
    created_at: new Date().toISOString(),
  });
  writeJson("historique", entries.slice(0, 500));
}

export async function provisionStageLocal(
  stageId: string,
  pack: StageLogistiquePack
): Promise<StageProvisionnementResult> {
  ensureLocalSeedData();
  const stage = localGetStageById(stageId);
  if (!stage) throw new Error("Stage introuvable");

  const infrastructures = readJson("infrastructures", getDefaultInfrastructures());
  const reservations = readJson<ReservationInfrastructure[]>("reservations", []);
  const participants = calculateStageParticipants(pack.joueur_ids, pack.entraineur_ids);
  const alertes: string[] = [];
  const conflits: string[] = [];
  let reservations_crees = 0;
  let besoins_restauration_crees = 0;

  let chambres = stage.chambres;
  let hebergement = stage.hebergement;
  let infrastructure_ids = [...stage.infrastructure_ids];
  const entraineur_ids =
    pack.entraineur_ids.length > 0 ? pack.entraineur_ids : stage.entraineur_ids;

  if (pack.hebergement?.actif) {
    const acc = calculateAccommodationNeeds(
      pack.hebergement,
      participants.joueurs,
      participants.coachs
    );
    chambres = acc.total_chambres;
    hebergement = true;
    alertes.push(`Hébergement local : ${acc.total_chambres} chambres, ${acc.total_nuitees} nuitées.`);
    type HebergementBesoin = { stage_id: string; at: string; acc: typeof acc };
    const prev = readJson<HebergementBesoin[]>("hebergement_besoins", []);
    writeJson("hebergement_besoins", [
      ...prev.filter((h) => h.stage_id !== stageId),
      { stage_id: stageId, at: new Date().toISOString(), acc },
    ]);
  }

  if (pack.restauration?.actif) {
    const meals = calculateMealNeeds(pack.restauration, participants.total);
    const besoins = readJson<BesoinRestauration[]>("besoins_restauration", []);
    const types = [
      { flag: pack.restauration.petit_dejeuner, label: "Petit-déjeuner", count: meals.petits_dejeuners },
      { flag: pack.restauration.dejeuner, label: "Déjeuner", count: meals.dejeuners },
      { flag: pack.restauration.diner, label: "Dîner", count: meals.diners },
    ] as const;
    for (const t of types) {
      if (!t.flag || t.count <= 0) continue;
      if (besoins.some((b) => b.notes?.includes(`stage_id:${stageId}`) && b.type_repas === t.label)) {
        continue;
      }
      const item: BesoinRestauration = {
        id: newLocalId(),
        titre: `${stage.stage_action} — ${t.label}`,
        type_evenement: "stage",
        date_evenement: pack.restauration.date_debut,
        date_besoin: pack.restauration.date_debut,
        type_repas: t.label,
        nombre_personnes: participants.total,
        menu_prevu: `${t.count} repas`,
        allergies: pack.restauration.allergies,
        prestataire_id: null,
        prestataire_nom: null,
        statut: "planifie",
        montant_estime: null,
        notes: `stage_id:${stageId}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      besoins.push(item);
      besoins_restauration_crees++;
    }
    writeJson("besoins_restauration", besoins);
    alertes.push(`Restauration locale : ${meals.total_repas} repas estimés.`);
  }

  if (pack.terrains?.actif) {
    const assign = assignCourtsAutomatically(
      infrastructures,
      reservations,
      pack.terrains,
      { date_debut: stage.date_debut, date_fin: stage.date_fin },
      stageId
    );
    conflits.push(...assign.conflits);
    if (assign.conflits.length) {
      throw new Error(assign.conflits[0] ?? "Pas assez de terrains disponibles sur ce créneau");
    }
    const courtIds = assign.courtIds;
    infrastructure_ids = [...new Set([...infrastructure_ids, ...courtIds])];
    const entries = generateStageCalendarEntries(
      stageId,
      stage.stage_action,
      stage.date_debut,
      stage.date_fin,
      courtIds,
      pack.terrains
    );
    const calendrier = readJson<{ stage_id: string; entries: typeof entries }[]>(
      "calendrier_stages",
      [] as { stage_id: string; entries: typeof entries }[]
    );
    writeJson("calendrier_stages", [
      ...calendrier.filter((c) => c.stage_id !== stageId),
      { stage_id: stageId, entries },
    ]);

    for (const entry of entries) {
      const exists = reservations.some(
        (r) =>
          r.stage_id === stageId &&
          r.infrastructure_id === entry.infrastructure_id &&
          r.date_debut === entry.date_debut &&
          r.statut !== "annulee"
      );
      if (exists) continue;
      const res: ReservationInfrastructure = {
        id: newLocalId(),
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
      };
      reservations.push(res);
      reservations_crees++;
    }
    writeJson("reservations", reservations);
  }

  const result: StageProvisionnementResult = {
    at: new Date().toISOString(),
    reservations_crees,
    besoins_restauration_crees,
    hebergement_cree: pack.hebergement?.actif ? 1 : 0,
    restauration_cree: besoins_restauration_crees > 0 ? 1 : 0,
    planning_crees: pack.terrains?.actif
      ? (readJson<{ stage_id: string; entries: unknown[] }[]>("calendrier_stages", []).find(
          (c) => c.stage_id === stageId
        )?.entries.length ?? 0)
      : 0,
    conflits,
    alertes,
    calendrier_entrees: pack.terrains?.actif
      ? (readJson<{ stage_id: string; entries: unknown[] }[]>("calendrier_stages", []).find(
          (c) => c.stage_id === stageId
        )?.entries.length ?? 0)
      : 0,
  };

  const packWithResult = { ...pack, dernier_provisionnement: result };
  const notes = embedLogistiqueInNotes(stripLogistiqueFromNotes(stage.notes), packWithResult);
  const duree = calculateStageDuration(stage.date_debut, stage.date_fin);

  localUpdateStageProgramme(stageId, {
    nombre_joueurs: participants.joueurs,
    nombre_encadrants: participants.coachs,
    chambres,
    hebergement,
    entraineur_ids,
    infrastructure_ids,
    notes,
    budget_prevu: stage.budget_prevu ?? participants.total * duree * 50,
  });

  logLocalHistorique({
    action: "creation",
    module: "stages",
    entite_id: stageId,
    entite_label: stage.stage_action,
    ancienne_valeur: null,
    nouvelle_valeur: "provisionnement local",
    commentaire: alertes.join(" · ") || "Mode local test",
  });

  return result;
}

export function localGetReservationsInfrastructure(): ReservationInfrastructure[] {
  return readJson<ReservationInfrastructure[]>("reservations", []);
}

export function localCreateReservationInfrastructure(
  input: ReservationInfrastructureInput
): ReservationInfrastructure {
  const all = localGetReservationsInfrastructure();
  const item: ReservationInfrastructure = {
    ...input,
    id: newLocalId(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  all.push(item);
  writeJson("reservations", all);
  return item;
}

export function localCreateBesoinRestauration(
  input: BesoinRestaurationInput
): BesoinRestauration {
  const all = readJson<BesoinRestauration[]>("besoins_restauration", []);
  const item: BesoinRestauration = {
    ...input,
    id: newLocalId(),
    prestataire_nom: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  all.push(item);
  writeJson("besoins_restauration", all);
  return item;
}
