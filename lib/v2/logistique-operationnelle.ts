import type {
  DemandeBilletAvionV2,
  HebergementStageV2,
  InterneChambreV2,
  JoueurV2,
  OccupationChambreV2,
  PlanningSeanceV2,
  PresenceRepasV2,
  RestaurationStageV2,
  StageProgrammeV2,
  TarifsBudgetSettings,
} from "@/lib/types/v2";
import {
  computeHebergementPrevuMad,
  computeRestaurationPrevuMad,
  computeTerrainsPrevuMad,
} from "@/lib/v2/budget-centre-calcul";
import { buildMealTotals } from "@/lib/v2/restauration-meals";
import { BUDGET_TARIFS_DEFAULTS } from "@/lib/v2/settings-store";
import { countDaysInclusive, countNightsHebergement } from "@/lib/v2/stage-calculations";

export function mapBatimentByPerson(personType: "joueur" | "coach", sexe?: string | null): "A" | "B" | "C" {
  if (personType === "coach") return "C";
  return sexe === "F" ? "B" : "A";
}

export function assignChambresAutomatique(
  chambres: InterneChambreV2[],
  joueurs: JoueurV2[],
  coaches: { id: string; nom: string; prenom: string }[],
  stage: StageProgrammeV2
): Array<Omit<OccupationChambreV2, "id" | "created_at">> {
  const libres = chambres.filter((c) => (c.statut ?? "libre") === "libre");
  const byBat = {
    A: libres.filter((c) => c.batiment === "A"),
    B: libres.filter((c) => c.batiment === "B"),
    C: libres.filter((c) => c.batiment === "C"),
  };

  const out: Array<Omit<OccupationChambreV2, "id" | "created_at">> = [];

  const males = joueurs.filter((j) => j.sexe !== "F");
  const females = joueurs.filter((j) => j.sexe === "F");

  for (const p of males) {
    const room = byBat.A.shift();
    if (!room) continue;
    out.push({
      chambre_id: room.id,
      occupant_id: p.id,
      occupant_type: "joueur",
      occupant_nom: `${p.prenom} ${p.nom}`,
      stage_id: stage.id,
      date_arrivee: stage.date_debut,
      date_depart: stage.date_fin,
      statut: "confirme",
      notes: null,
    });
  }
  for (const p of females) {
    const room = byBat.B.shift();
    if (!room) continue;
    out.push({
      chambre_id: room.id,
      occupant_id: p.id,
      occupant_type: "joueur",
      occupant_nom: `${p.prenom} ${p.nom}`,
      stage_id: stage.id,
      date_arrivee: stage.date_debut,
      date_depart: stage.date_fin,
      statut: "confirme",
      notes: null,
    });
  }
  for (const c of coaches) {
    const room = byBat.C.shift();
    if (!room) continue;
    out.push({
      chambre_id: room.id,
      occupant_id: c.id,
      occupant_type: "coach",
      occupant_nom: `${c.prenom} ${c.nom}`,
      stage_id: stage.id,
      date_arrivee: stage.date_debut,
      date_depart: stage.date_fin,
      statut: "confirme",
      notes: "Coach",
    });
  }
  return out;
}

export function buildRepasRows(
  presences: PresenceRepasV2[],
  fallbackPeople: { id: string; nom: string }[],
  day: string
) {
  const dayRows = presences.filter((p) => p.date_repas === day);
  if (dayRows.length > 0) return dayRows;
  return fallbackPeople.map((p) => ({
    id: `${p.id}-${day}`,
    stage_id: "",
    personne_id: p.id,
    personne_type: "joueur",
    personne_nom: p.nom,
    date_repas: day,
    petit_dejeuner: true,
    dejeuner: true,
    diner: true,
  })) satisfies PresenceRepasV2[];
}

export function calcFacturationClub(
  input: {
    stage: StageProgrammeV2;
    hebergement?: HebergementStageV2 | null;
    restauration?: RestaurationStageV2 | null;
    planning: PlanningSeanceV2[];
  },
  tarifs: TarifsBudgetSettings = BUDGET_TARIFS_DEFAULTS
) {
  const nuits = countNightsHebergement(
    input.hebergement?.date_debut ?? input.stage.date_debut,
    input.hebergement?.date_fin ?? input.stage.date_fin
  );
  const nbChJ = input.hebergement?.nb_chambres_joueurs ?? input.hebergement?.chambres ?? 0;
  const nbChC = input.hebergement?.nb_chambres_coachs ?? 0;
  const montantHebergement = computeHebergementPrevuMad(nbChJ, nbChC, nuits, tarifs);

  let pdj = 0;
  let dej = 0;
  let din = 0;
  if (input.restauration) {
    const jours = countDaysInclusive(input.restauration.date_debut, input.restauration.date_fin);
    const totals = buildMealTotals(input.restauration, jours);
    pdj = totals.pdj;
    dej = totals.dej;
    din = totals.diner;
  }
  const montantRestauration = computeRestaurationPrevuMad(pdj, dej, din, tarifs);

  const joursStage = countDaysInclusive(input.stage.date_debut, input.stage.date_fin);
  const heuresTerrains = input.planning.length * 4;
  const montantTerrains = input.stage.terrains
    ? computeTerrainsPrevuMad(joursStage, true)
    : heuresTerrains * 150;

  return {
    nuits,
    pdj,
    dej,
    din,
    heuresTerrains,
    montantHebergement,
    montantRestauration,
    montantTerrains,
    montantTotal: montantHebergement + montantRestauration + montantTerrains,
  };
}

export function calcDispatchHoursForPlayer(playerId: string, seances: PlanningSeanceV2[], stageLinks: { joueur_id: string }[]) {
  if (!stageLinks.some((l) => l.joueur_id === playerId)) return 0;
  return seances.length * 4;
}

export function calcPendingBillets(billets: DemandeBilletAvionV2[]) {
  return billets.filter((b) => b.statut === "demande").length;
}

