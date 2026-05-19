import type { ReportMeta } from "@/lib/export/reports";
import type { StageProgramme } from "@/lib/types/stages";
import type { StageAutomatisation } from "@/lib/data/stage-operations";
import { formatDate } from "@/lib/utils/dates";
import { statutStageLabel } from "@/lib/utils/stage-automation";

export function buildStageFicheReport(
  stage: StageProgramme,
  auto: StageAutomatisation,
  infraLabels: string[],
  entraineurLabels: string[]
): ReportMeta {
  return {
    titre: "Fiche stage — Centre National FRMT",
    sousTitre: stage.stage_action,
    filtres: `${stage.categorie} · ${statutStageLabel(stage.statut)} · ${formatDate(stage.date_debut)} → ${formatDate(stage.date_fin)}`,
    colonnes: ["Rubrique", "Valeur"],
    lignes: [
      ["Source", stage.source],
      ["Lieu", stage.lieu ?? "—"],
      ["Joueurs / Encadrants", `${stage.nombre_joueurs} / ${stage.nombre_encadrants}`],
      ["Participants total", String(auto.total_participants)],
      ["Durée (jours)", String(auto.duree_jours)],
      ["Hébergement", stage.hebergement ? `Oui — ${auto.chambres_requises} chambres` : "Non"],
      ["Repas estimés", String(auto.repas_estimes)],
      ["Budget estimé", `${auto.budget_estime.toLocaleString("fr-FR")} MAD`],
      ["Budget prévu", stage.budget_prevu != null ? `${stage.budget_prevu} MAD` : "—"],
      ["Infrastructures", infraLabels.join(", ") || "—"],
      ["Entraîneurs", entraineurLabels.join(", ") || "—"],
      ["Conflits détectés", auto.conflits.length ? auto.conflits.map((c) => c.message).join(" · ") : "Aucun"],
      ["Notes", stage.notes ?? "—"],
    ],
  };
}
