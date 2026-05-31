import type { ReportMeta } from "@/lib/export/reports";
import { formatDatePrint } from "@/lib/print/format-date";
import { DEFAULT_OBSERVATIONS } from "@/lib/print/report-enrich";

export function buildOccupationAutoReport(
  data: {
    date: string;
    taux_chambres_pct: number;
    chambres_occupees: number;
    chambres_total: number;
    terrains_occupes: number;
    terrains_total: number;
    taux_terrains_pct: number;
    taux_fitness_pct: number;
    taux_natation_pct: number;
    alertes: string[];
  }
): ReportMeta {
  return {
    titre: "Rapport occupation",
    sousTitre: `Date : ${formatDatePrint(data.date)}`,
    periodeLabel: formatDatePrint(data.date),
    mainTableTitle: "Indicateurs du jour",
    kpis: [
      {
        label: "Chambres",
        value: `${data.taux_chambres_pct}%`,
        sub: `${data.chambres_occupees}/${data.chambres_total}`,
      },
      {
        label: "Terrains",
        value: `${data.taux_terrains_pct}%`,
        sub: `${data.terrains_occupes}/${data.terrains_total}`,
      },
      { label: "Fitness", value: `${data.taux_fitness_pct}%`, sub: "occupation" },
      { label: "Natation", value: `${data.taux_natation_pct}%`, sub: "occupation" },
    ],
    colonnes: ["Indicateur", "Valeur"],
    headerAlign: ["left", "left"],
    cellAlign: ["left", "left"],
    lignes: [
      [
        "Chambres occupées",
        `${data.chambres_occupees} / ${data.chambres_total} (${data.taux_chambres_pct}%)`,
      ],
      ["Terrains", `${data.terrains_occupes} / ${data.terrains_total} (${data.taux_terrains_pct}%)`],
      ["Salle fitness", `${data.taux_fitness_pct}%`],
      ["Salle natation", `${data.taux_natation_pct}%`],
      ["Alertes", data.alertes.length ? data.alertes.join(" · ") : "Aucune"],
    ],
    observations: DEFAULT_OBSERVATIONS,
  };
}
