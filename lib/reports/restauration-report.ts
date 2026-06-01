import type { ReportMeta } from "@/lib/export/reports";
import { formatDatePrint, formatPeriodePrint } from "@/lib/print/format-date";
import type { StageProvisionSummary } from "@/lib/data/stage-besoins";
import type { StageRestaurationRecord } from "@/lib/types/stage-services";

function daysBetween(debut: string, fin: string): number {
  const a = new Date(debut.slice(0, 10) + "T12:00:00");
  const b = new Date(fin.slice(0, 10) + "T12:00:00");
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 1;
  return Math.max(1, Math.round((b.getTime() - a.getTime()) / 86400000) + 1);
}

export function buildRestaurationStagesReport(
  records: StageRestaurationRecord[],
  summaries: StageProvisionSummary[],
  options?: {
    generatedBy?: string;
    generatedRole?: string;
    filtreStatut?: string;
    periodeDebut?: string;
    periodeFin?: string;
  }
): ReportMeta {
  const stageName = new Map(summaries.map((s) => [s.stage.id, s.stage.stage_action]));
  const stageCat = new Map(summaries.map((s) => [s.stage.id, s.stage.categorie]));

  const rows = records.map((r) => {
    const jours = daysBetween(r.date_debut, r.date_fin);
    return {
      nom: stageName.get(r.stage_id) ?? `Stage ${r.stage_id.slice(0, 8)}`,
      dateDebut: r.date_debut,
      dateFin: r.date_fin,
      pdj: r.petit_dejeuner,
      dejeuner: r.dejeuner,
      diner: r.diner,
      categorie: stageCat.get(r.stage_id) ?? "—",
      nbPersonnes: r.nb_personnes,
      nbJours: jours,
      totalRepas: r.total_repas,
      statut: r.statut,
    };
  });

  const totalRepas = rows.reduce((s, r) => s + r.totalRepas, 0);
  const totalPDJ = rows.filter((r) => r.pdj).reduce((s, r) => s + r.nbPersonnes * r.nbJours, 0);
  const totalDejeuners = rows.filter((r) => r.dejeuner).reduce((s, r) => s + r.nbPersonnes * r.nbJours, 0);
  const totalDiners = rows.filter((r) => r.diner).reduce((s, r) => s + r.nbPersonnes * r.nbJours, 0);
  const totalPersonnes = rows.reduce((s, r) => s + r.nbPersonnes, 0);
  const stagesAvecPDJ = rows.filter((r) => r.pdj).length;
  const stagesAvecDejeuner = rows.filter((r) => r.dejeuner).length;
  const stagesAvecDiner = rows.filter((r) => r.diner).length;

  const periodeDebut =
    options?.periodeDebut ??
    (rows.length ? rows.map((r) => r.dateDebut).sort()[0] : undefined);
  const periodeFin =
    options?.periodeFin ??
    (rows.length ? rows.map((r) => r.dateFin).sort().at(-1) : undefined);

  const pct = (n: number) => (totalRepas > 0 ? `${Math.round((n / totalRepas) * 100)}%` : "0%");

  return {
    titre: "Fiche restauration",
    sousTitre: "FRMT",
    mainTableTitle: "Détail par stage",
    periodeLabel: formatPeriodePrint(periodeDebut, periodeFin),
    generatedBy: options?.generatedBy,
    generatedRole: options?.generatedRole,
    metaRows: [
      [
        { label: "Période couverte", value: formatPeriodePrint(periodeDebut, periodeFin) },
        { label: "Nombre de stages", value: String(rows.length) },
      ],
      [
        { label: "Généré par", value: options?.generatedBy ?? "—" },
        { label: "Filtre", value: options?.filtreStatut && options.filtreStatut !== "Tous" ? options.filtreStatut : "—" },
      ],
    ],
    kpis: [
      { label: "Total repas", value: String(totalRepas), sub: "toutes catégories" },
      { label: "Petits-déjeuners", value: String(totalPDJ), sub: "PDJ estimés" },
      { label: "Déjeuners", value: String(totalDejeuners), sub: "midi" },
      { label: "Dîners", value: String(totalDiners), sub: "soir" },
    ],
    colonnes: [
      "STAGE",
      "PÉRIODE",
      "PDJ",
      "DÉJEUNER",
      "DÎNER",
      "CATÉGORIE",
      "PERSONNES",
      "JOURS",
      "TOTAL REPAS",
    ],
    headerAlign: ["left", "center", "center", "center", "center", "center", "center", "center", "center"],
    cellAlign: ["left", "center", "center", "center", "center", "center", "center", "center", "center"],
    lignes: rows.map((s) => [
      s.nom,
      formatPeriodePrint(s.dateDebut, s.dateFin),
      s.pdj ? "Oui" : "Non",
      s.dejeuner ? "Oui" : "Non",
      s.diner ? "Oui" : "Non",
      s.categorie,
      String(s.nbPersonnes),
      String(s.nbJours),
      String(s.totalRepas),
    ]),
    footer: [
      [
        "TOTAUX GÉNÉRAUX",
        "",
        "",
        "",
        "",
        "",
        String(totalPersonnes),
        "—",
        String(totalRepas),
      ],
    ],
    recap: {
      title: "Récapitulatif par type de repas",
      colonnes: ["TYPE DE REPAS", "STAGES CONCERNÉS", "TOTAL SERVIS", "% DU TOTAL"],
      lignes: [
        ["Petit-déjeuner (PDJ)", String(stagesAvecPDJ), String(totalPDJ), pct(totalPDJ)],
        ["Déjeuner", String(stagesAvecDejeuner), String(totalDejeuners), pct(totalDejeuners)],
        ["Dîner", String(stagesAvecDiner), String(totalDiners), pct(totalDiners)],
      ],
      footer: [["TOTAL", "", String(totalRepas), totalRepas > 0 ? "100%" : "0%"]],
      headerAlign: ["left", "center", "center", "center"],
      cellAlign: ["left", "center", "center", "center"],
    },
  };
}
