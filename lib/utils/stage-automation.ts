import type { StageProgramme } from "@/lib/types/stages";
import type { Infrastructure } from "@/lib/types/infrastructures";
import type { Materiel } from "@/lib/types/materiel";
import type { ReservationInfrastructure } from "@/lib/types/reservation-infra";

export function stageDureeJours(stage: Pick<StageProgramme, "date_debut" | "date_fin">): number {
  const start = new Date(stage.date_debut);
  const end = new Date(stage.date_fin);
  const diff = end.getTime() - start.getTime();
  return Math.max(1, Math.floor(diff / (1000 * 60 * 60 * 24)) + 1);
}

export function stageTotalParticipants(
  stage: Pick<StageProgramme, "nombre_joueurs" | "nombre_encadrants">
): number {
  return stage.nombre_joueurs + stage.nombre_encadrants;
}

export function stageRepasEstimes(stage: StageProgramme): number {
  const jours = stageDureeJours(stage);
  return stageTotalParticipants(stage) * jours * 3;
}

export function stageChambresRequises(stage: StageProgramme): number {
  if (!stage.hebergement) return 0;
  if (stage.chambres > 0) return stage.chambres;
  return Math.ceil(stageTotalParticipants(stage) / 2);
}

export function stageBudgetEstime(stage: StageProgramme, materiels: Materiel[]): number {
  const jours = stageDureeJours(stage);
  const participants = stageTotalParticipants(stage);
  const repas = stageRepasEstimes(stage) * 45;
  const hebergement = stageChambresRequises(stage) * jours * 320;
  const infra = stage.infrastructure_ids.length * jours * 180;
  const materiel = stage.materiel_assignations.reduce((sum, a) => {
    const m = materiels.find((x) => x.id === a.materiel_id);
    return sum + (m?.prix_unitaire ?? 0) * a.quantite;
  }, 0);
  return Math.round(repas + hebergement + infra + materiel + participants * 25);
}

export function hasInfrastructureOverlap(
  reservations: ReservationInfrastructure[],
  infrastructureId: string,
  dateDebut: Date,
  dateFin: Date,
  excludeId?: string
): boolean {
  return reservations.some((r) => {
    if (r.statut === "annulee") return false;
    if (r.infrastructure_id !== infrastructureId) return false;
    if (excludeId && r.id === excludeId) return false;
    const a0 = dateDebut.getTime();
    const a1 = dateFin.getTime();
    const b0 = new Date(r.date_debut).getTime();
    const b1 = new Date(r.date_fin).getTime();
    return a0 < b1 && a1 > b0;
  });
}

export type ConflitInfrastructure = {
  infrastructure_id: string;
  infrastructure_nom: string;
  date_debut: string;
  date_fin: string;
  message: string;
};

export function detecterConflitsStage(
  stage: StageProgramme,
  infrastructures: Infrastructure[],
  reservations: ReservationInfrastructure[]
): ConflitInfrastructure[] {
  const conflits: ConflitInfrastructure[] = [];
  const debut = new Date(`${stage.date_debut}T08:00:00`);
  const fin = new Date(`${stage.date_fin}T20:00:00`);

  for (const infraId of stage.infrastructure_ids) {
    const infra = infrastructures.find((i) => i.id === infraId);
    if (!infra || infra.statut === "maintenance" || infra.statut === "ferme") {
      conflits.push({
        infrastructure_id: infraId,
        infrastructure_nom: infra?.nom ?? infraId,
        date_debut: stage.date_debut,
        date_fin: stage.date_fin,
        message: infra ? `${infra.nom} indisponible (${infra.statut})` : "Infrastructure introuvable",
      });
      continue;
    }
    if (hasInfrastructureOverlap(reservations, infraId, debut, fin)) {
      conflits.push({
        infrastructure_id: infraId,
        infrastructure_nom: infra.nom,
        date_debut: stage.date_debut,
        date_fin: stage.date_fin,
        message: `${infra.nom} déjà réservé sur cette période`,
      });
    }
  }
  return conflits;
}

export function statutStageLabel(statut: StageProgramme["statut"]): string {
  const map: Record<StageProgramme["statut"], string> = {
    prevu: "Prévu",
    confirme: "Confirmé",
    en_cours: "En cours",
    termine: "Terminé",
    annule: "Annulé",
  };
  return map[statut];
}
