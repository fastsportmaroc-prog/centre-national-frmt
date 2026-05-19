import type { ReportMeta } from "@/lib/export/reports";
import type { StageProgramme } from "@/lib/types/stages";
import { formatDate } from "@/lib/utils/dates";

type Options = {
  vue: "liste" | "mois" | "annee";
  periodeLabel?: string;
  filtresLabel?: string;
};

export function buildCalendrierStagesReport(
  stages: StageProgramme[],
  options: Options
): ReportMeta {
  const sorted = [...stages].sort((a, b) => a.date_debut.localeCompare(b.date_debut));

  const vueLabel =
    options.vue === "mois"
      ? "Vue mensuelle"
      : options.vue === "annee"
        ? "Vue annuelle"
        : "Vue liste";

  const filtres = [vueLabel, options.periodeLabel, options.filtresLabel]
    .filter(Boolean)
    .join(" · ");

  return {
    titre: "Calendrier CNE — Programme & stages",
    sousTitre: options.periodeLabel,
    filtres: filtres || undefined,
    colonnes: [
      "ID",
      "Source",
      "Catégorie",
      "Stage / Action",
      "Date début",
      "Date fin",
      "Joueurs",
      "Encadrants",
      "Hébergement",
      "Chambres",
      "Lieu",
    ],
    lignes: sorted.map((s) => [
      s.id_excel ?? "—",
      s.source,
      s.categorie,
      s.stage_action,
      formatDate(s.date_debut),
      formatDate(s.date_fin),
      String(s.nombre_joueurs),
      String(s.nombre_encadrants),
      s.hebergement ? "Oui" : "Non",
      String(s.chambres),
      s.lieu ?? "—",
    ]),
  };
}
