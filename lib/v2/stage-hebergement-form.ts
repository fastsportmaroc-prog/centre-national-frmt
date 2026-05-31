import {
  mergeParticipantDatesForStage,
  parseParticipantsDatesPayload,
  stripParticipantsMarkerFromRemarques,
} from "@/lib/hebergement/participants-dates";
import type { EntraineurV2, HebergementStageV2, JoueurV2, StageHebergementForm } from "@/lib/types/v2";
import { calcChambresCoachs, calcChambresJoueurs } from "@/lib/v2/stage-calculations";

export function suggestedChambresCounts(
  nbJoueurs: number,
  nbCoachs: number,
  types: Pick<StageHebergementForm, "type_chambre_joueurs" | "type_chambre_coachs">
): { nb_chambres_joueurs: number; nb_chambres_coachs: number } {
  return {
    nb_chambres_joueurs: calcChambresJoueurs(nbJoueurs, types.type_chambre_joueurs),
    nb_chambres_coachs: calcChambresCoachs(nbCoachs, types.type_chambre_coachs),
  };
}

export function hebergementToForm(
  stage: { date_debut: string; date_fin: string; hebergement?: boolean },
  row: HebergementStageV2 | null,
  joueurs: Pick<JoueurV2, "id" | "nom" | "prenom">[] = [],
  coachs: Pick<EntraineurV2, "id" | "nom" | "prenom">[] = [],
  nbJoueurs = joueurs.length,
  nbCoachs = coachs.length
): StageHebergementForm {
  const baseTypes = {
    type_chambre_joueurs: "double" as const,
    type_chambre_coachs: "single" as const,
  };

  if (row) {
    const types = {
      type_chambre_joueurs:
        (row.type_chambre_joueurs as StageHebergementForm["type_chambre_joueurs"]) ?? "double",
      type_chambre_coachs:
        (row.type_chambre_coachs as StageHebergementForm["type_chambre_coachs"]) ?? "single",
    };
    const suggested = suggestedChambresCounts(nbJoueurs, nbCoachs, types);
    const storedPayload = parseParticipantsDatesPayload(row);
    return {
      actif: true,
      date_debut: row.date_debut,
      date_fin: row.date_fin,
      ...types,
      nb_chambres_joueurs: row.nb_chambres_joueurs ?? suggested.nb_chambres_joueurs,
      nb_chambres_coachs: row.nb_chambres_coachs ?? suggested.nb_chambres_coachs,
      kitchenette: row.kitchenette ?? false,
      remarques: stripParticipantsMarkerFromRemarques(row.remarques ?? ""),
      dates_participants_actif: storedPayload.actif,
      participants_dates: mergeParticipantDatesForStage(
        joueurs,
        coachs,
        row.date_debut,
        row.date_fin,
        storedPayload.rows
      ),
    };
  }

  const suggested = suggestedChambresCounts(nbJoueurs, nbCoachs, baseTypes);
  return {
    actif: !!stage.hebergement,
    date_debut: stage.date_debut,
    date_fin: stage.date_fin,
    ...baseTypes,
    nb_chambres_joueurs: suggested.nb_chambres_joueurs,
    nb_chambres_coachs: suggested.nb_chambres_coachs,
    kitchenette: false,
    remarques: "",
    dates_participants_actif: false,
    participants_dates: mergeParticipantDatesForStage(
      joueurs,
      coachs,
      stage.date_debut,
      stage.date_fin,
      []
    ),
  };
}

export function totalChambresFromForm(form: StageHebergementForm): number {
  return Math.max(0, form.nb_chambres_joueurs) + Math.max(0, form.nb_chambres_coachs);
}
