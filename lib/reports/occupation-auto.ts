import type { ReportMeta } from "@/lib/export/reports";

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
    titre: "Rapport occupation — Centre National FRMT",
    sousTitre: `Date : ${data.date}`,
    colonnes: ["Indicateur", "Valeur"],
    lignes: [
      ["Chambres occupées", `${data.chambres_occupees} / ${data.chambres_total} (${data.taux_chambres_pct}%)`],
      ["Terrains", `${data.terrains_occupes} / ${data.terrains_total} (${data.taux_terrains_pct}%)`],
      ["Salle fitness", `${data.taux_fitness_pct}%`],
      ["Salle natation", `${data.taux_natation_pct}%`],
      ["Alertes", data.alertes.length ? data.alertes.join(" · ") : "Aucune"],
    ],
  };
}
