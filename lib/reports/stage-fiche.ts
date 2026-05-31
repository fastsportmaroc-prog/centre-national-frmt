import type { ReportMeta } from "@/lib/export/reports";
import type { StageAutomatisation } from "@/lib/data/stage-operations";
import type { StageProgramme } from "@/lib/types/stages";
import type { StageLogistiquePack } from "@/lib/types/stage-logistique";
import {
  calculateAccommodationNeeds,
  calculateMealNeeds,
  calculateStageParticipants,
  creneauHoraires,
} from "@/lib/stages/stage-calculations";
import { formatDatePrint, formatPeriodePrint } from "@/lib/print/format-date";
import { DEFAULT_OBSERVATIONS } from "@/lib/print/report-enrich";
import { stripLogistiqueFromNotes } from "@/lib/stages/stage-logistique-serializer";

export function buildStageFicheReport(
  stage: StageProgramme,
  auto: StageAutomatisation,
  infraLabels: string[],
  entraineurLabels: string[],
  joueurLabels: string[],
  logistique: StageLogistiquePack | null
): ReportMeta {
  const lignes: string[][] = [
    ["Source", stage.source],
    ["Lieu", stage.lieu ?? "—"],
    ["Durée (jours)", String(auto.duree_jours)],
    ["Budget estimé", `${auto.budget_estime.toLocaleString("fr-FR")} MAD`],
    ["Notes", stripLogistiqueFromNotes(stage.notes) || "—"],
  ];

  lignes.push(
    ["Joueurs", joueurLabels.length ? joueurLabels.join(", ") : String(stage.nombre_joueurs)],
    [
      "Coachs / staff",
      entraineurLabels.length ? entraineurLabels.join(", ") : String(stage.nombre_encadrants),
    ],
    ["Total participants", String(auto.total_participants)]
  );

  if (logistique?.hebergement?.actif) {
    const p = calculateStageParticipants(
      logistique.joueur_ids,
      logistique.entraineur_ids.length ? logistique.entraineur_ids : stage.entraineur_ids
    );
    const acc = calculateAccommodationNeeds(
      logistique.hebergement,
      p.joueurs || stage.nombre_joueurs,
      p.coachs || stage.nombre_encadrants
    );
    lignes.push(
      ["Hébergement", "Oui"],
      ["Dates hébergement", `${logistique.hebergement.date_debut} → ${logistique.hebergement.date_fin}`],
      ["Chambres joueurs", String(acc.chambres_joueurs)],
      ["Chambres staff", String(acc.chambres_staff)],
      ["Total chambres / nuitées", `${acc.total_chambres} / ${acc.total_nuitees}`]
    );
    if (logistique.hebergement.kitchenette) {
      lignes.push(["Kitchenette", String(acc.chambres_kitchenette)]);
    }
  }

  if (logistique?.restauration?.actif) {
    const meals = calculateMealNeeds(logistique.restauration, auto.total_participants);
    lignes.push(
      ["Restauration", "Oui"],
      ["Dates restauration", `${logistique.restauration.date_debut} → ${logistique.restauration.date_fin}`]
    );
    if (logistique.restauration.petit_dejeuner) {
      lignes.push(["Petits-déjeuners", String(meals.petits_dejeuners)]);
    }
    if (logistique.restauration.dejeuner) lignes.push(["Déjeuners", String(meals.dejeuners)]);
    if (logistique.restauration.diner) lignes.push(["Dîners", String(meals.diners)]);
    lignes.push(["Total repas", String(meals.total_repas)]);
    if (logistique.restauration.allergies) {
      lignes.push(["Allergies", logistique.restauration.allergies]);
    }
  }

  if (logistique?.terrains?.actif) {
    const h = creneauHoraires(logistique.terrains.creneau, {
      debut: logistique.terrains.heure_debut,
      fin: logistique.terrains.heure_fin,
    });
    lignes.push(
      ["Terrains", "Oui"],
      ["Courts / infra", infraLabels.join(", ") || "—"],
      ["Créneau", `${logistique.terrains.creneau} (${h.debut}–${h.fin})`]
    );
    if (auto.conflits.length) {
      lignes.push(["Conflits", auto.conflits.map((c) => c.message).join(" · ")]);
    }
  }

  return {
    titre: "Fiche stage",
    sousTitre: stage.stage_action,
    filtres: `${stage.categorie} · ${formatPeriodePrint(stage.date_debut, stage.date_fin)}`,
    periodeLabel: formatPeriodePrint(stage.date_debut, stage.date_fin),
    mainTableTitle: "Synthèse du stage",
    kpis: [
      { label: "Durée", value: `${auto.duree_jours} j`, sub: "calendaires" },
      { label: "Participants", value: String(auto.total_participants), sub: "total" },
      {
        label: "Budget",
        value: `${auto.budget_estime.toLocaleString("fr-FR")}`,
        sub: "MAD estimés",
      },
      { label: "Catégorie", value: stage.categorie, sub: "stage" },
    ],
    colonnes: ["Rubrique", "Valeur"],
    headerAlign: ["left", "left"],
    cellAlign: ["left", "left"],
    lignes,
    observations: DEFAULT_OBSERVATIONS,
  };
}
