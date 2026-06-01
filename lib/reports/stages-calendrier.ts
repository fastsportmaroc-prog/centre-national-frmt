import type { ReportMeta } from "@/lib/export/reports";
import type { StageProgramme } from "@/lib/types/stages";
import { formatDatePrint, formatPeriodePrint } from "@/lib/print/format-date";
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

  const totalJoueurs = sorted.reduce((s, x) => s + (x.nombre_joueurs ?? 0), 0);
  const avecHebergement = sorted.filter((s) => s.hebergement).length;
  const dates = sorted.flatMap((s) => [s.date_debut, s.date_fin]).filter(Boolean).sort();
  const periode =
    dates.length >= 2
      ? formatPeriodePrint(dates[0], dates[dates.length - 1])
      : options.periodeLabel ?? "—";

  const byCat = new Map<string, number>();
  for (const s of sorted) {
    byCat.set(s.categorie, (byCat.get(s.categorie) ?? 0) + 1);
  }
  const recapRows = [...byCat.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([cat, n]) => [cat, String(n), `${Math.round((n / sorted.length) * 100) || 0}%`]);

  return {
    titre: "Calendrier — Programme & stages",
    sousTitre: options.periodeLabel,
    filtres: filtres || undefined,
    periodeLabel: periode,
    statutFiltre: options.filtresLabel,
    mainTableTitle: "Programme des stages",
    metaRows: [
      [
        { label: "Période", value: periode },
        { label: "Stages listés", value: String(sorted.length) },
      ],
      [
        { label: "Vue", value: vueLabel },
        { label: "Filtres", value: options.filtresLabel ?? "Tous" },
      ],
    ],
    kpis: [
      { label: "Stages", value: String(sorted.length), sub: periode },
      { label: "Joueurs", value: String(totalJoueurs), sub: "places déclarées" },
      { label: "Hébergement", value: String(avecHebergement), sub: "stages avec nuitées" },
      {
        label: "Catégories",
        value: String(byCat.size),
        sub: "catégories d'âge",
      },
    ],
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
    headerAlign: ["left", "center", "center", "left", "center", "center", "center", "center", "center", "center", "left"],
    cellAlign: ["left", "center", "center", "left", "center", "center", "center", "center", "center", "center", "left"],
    lignes: sorted.map((s) => [
      s.id_excel ?? "—",
      s.source,
      s.categorie,
      s.stage_action,
      formatDatePrint(s.date_debut),
      formatDatePrint(s.date_fin),
      String(s.nombre_joueurs),
      String(s.nombre_encadrants),
      s.hebergement ? "Oui" : "Non",
      String(s.chambres),
      s.lieu ?? "—",
    ]),
    recap: recapRows.length
      ? {
          title: "Répartition par catégorie",
          colonnes: ["CATÉGORIE", "NOMBRE DE STAGES", "% DU TOTAL"],
          lignes: recapRows,
          footer: [["TOTAL", String(sorted.length), sorted.length ? "100%" : "0%"]],
          headerAlign: ["left", "center", "center"],
          cellAlign: ["left", "center", "center"],
        }
      : undefined,
  };
}
