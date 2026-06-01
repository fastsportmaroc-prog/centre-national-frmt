import {
  calculateAccommodationNeeds,
  calculateMealNeeds,
  calculateStageDuration,
  calculateStageParticipants,
  creneauHoraires,
} from "@/lib/stages/stage-calculations";
import { parseLogistiqueFromNotes } from "@/lib/stages/stage-logistique-serializer";
import { getInfrastructures } from "@/lib/data/infrastructures";
import { getJoueurs } from "@/lib/data/joueurs";
import { getEntraineurs } from "@/lib/data/entraineurs";
import { getOccupationCentre } from "@/lib/data/centre-occupation";
import { getStageProvisionSummaries } from "@/lib/data/stage-besoins";
import { getStagesProgramme } from "@/lib/data/stages";
import type { StageProgramme } from "@/lib/types/stages";
import type { ReportMeta } from "@/lib/export/reports";
import { formatDatePrint, formatPeriodePrint } from "@/lib/print/format-date";
import { statutStageLabel } from "@/lib/utils/stage-automation";

export type RapportStageDetail = {
  stage: StageProgramme;
  joueurs: string[];
  coachs: string[];
  hebergement: {
    chambres_joueurs: number;
    chambres_staff: number;
    kitchenette: boolean;
    nuitees: number;
  } | null;
  restauration: {
    petits_dejeuners: number;
    dejeuners: number;
    diners: number;
    total: number;
  } | null;
  terrains: {
    count: number;
    labels: string[];
    surface: string;
    creneau: string;
  } | null;
  budget_estime: number | null;
};

export async function getRapportStageDetail(stageId: string): Promise<RapportStageDetail | null> {
  const [summaries, joueurs, coaches, infras, allStages] = await Promise.all([
    getStageProvisionSummaries(),
    getJoueurs(),
    getEntraineurs(),
    getInfrastructures(),
    getStagesProgramme(),
  ]);
  const summary = summaries.find((s) => s.stage.id === stageId);
  const stage = summary?.stage ?? allStages.find((s) => s.id === stageId);
  if (!stage) return null;

  const reservations = summary?.reservations ?? [];
  const pack = parseLogistiqueFromNotes(stage.notes);
  const p = calculateStageParticipants(
    pack?.joueur_ids ?? [],
    pack?.entraineur_ids.length ? pack.entraineur_ids : stage.entraineur_ids
  );

  const joueurLabels = (pack?.joueur_ids ?? []).map((id) => {
    const j = joueurs.find((x) => x.id === id);
    return j ? `${j.prenom} ${j.nom}` : id;
  });
  const coachLabels = (pack?.entraineur_ids.length
    ? pack.entraineur_ids
    : stage.entraineur_ids
  ).map((id) => {
    const c = coaches.find((x) => x.id === id);
    return c ? `${c.prenom} ${c.nom}` : id;
  });

  let hebergement: RapportStageDetail["hebergement"] = null;
  if (pack?.hebergement?.actif) {
    const acc = calculateAccommodationNeeds(pack.hebergement, p.joueurs, p.coachs);
    hebergement = {
      chambres_joueurs: acc.chambres_joueurs,
      chambres_staff: acc.chambres_staff,
      kitchenette: pack.hebergement.kitchenette,
      nuitees: acc.total_nuitees,
    };
  }

  let restauration: RapportStageDetail["restauration"] = null;
  if (pack?.restauration?.actif) {
    const meals = calculateMealNeeds(pack.restauration, p.total);
    restauration = {
      petits_dejeuners: meals.petits_dejeuners,
      dejeuners: meals.dejeuners,
      diners: meals.diners,
      total: meals.total_repas,
    };
  }

  let terrains: RapportStageDetail["terrains"] = null;
  if (pack?.terrains?.actif) {
    const labels = reservations.map(
      (r) => infras.find((i) => i.id === r.infrastructure_id)?.nom ?? r.infrastructure_id
    );
    const h = creneauHoraires(pack.terrains.creneau, {
      debut: pack.terrains.heure_debut,
      fin: pack.terrains.heure_fin,
    });
    terrains = {
      count: reservations.length || pack.terrains.nombre_courts,
      labels,
      surface: pack.terrains.surface,
      creneau: `${pack.terrains.creneau} (${h.debut}–${h.fin})`,
    };
  }

  return {
    stage,
    joueurs: joueurLabels,
    coachs: coachLabels,
    hebergement,
    restauration,
    terrains,
    budget_estime: stage.budget_prevu,
  };
}

export function buildRapportStagePdfMeta(detail: RapportStageDetail): ReportMeta {
  const lignes: string[][] = [
    ["Stage", detail.stage.stage_action],
    ["Catégorie", detail.stage.categorie],
    ["Période", formatPeriodePrint(detail.stage.date_debut, detail.stage.date_fin)],
    ["Statut", statutStageLabel(detail.stage.statut)],
    ["Lieu", detail.stage.lieu ?? "—"],
  ];
  if (detail.joueurs.length) lignes.push(["Joueurs", detail.joueurs.join(", ")]);
  if (detail.coachs.length) lignes.push(["Coachs", detail.coachs.join(", ")]);
  if (detail.hebergement) {
    lignes.push(
      ["Chambres joueurs", String(detail.hebergement.chambres_joueurs)],
      ["Chambres staff", String(detail.hebergement.chambres_staff)],
      ["Nuitées", String(detail.hebergement.nuitees)],
      ["Kitchenette", detail.hebergement.kitchenette ? "Oui" : "Non"]
    );
  }
  if (detail.restauration) {
    lignes.push(
      ["Petits-déjeuners", String(detail.restauration.petits_dejeuners)],
      ["Déjeuners", String(detail.restauration.dejeuners)],
      ["Dîners", String(detail.restauration.diners)],
      ["Total repas", String(detail.restauration.total)]
    );
  }
  if (detail.terrains) {
    lignes.push(
      ["Créneaux terrains", String(detail.terrains.count)],
      ["Surface", detail.terrains.surface],
      ["Créneau", detail.terrains.creneau],
      ["Courts", detail.terrains.labels.join(", ") || "—"]
    );
  }
  if (detail.budget_estime != null) {
    lignes.push(["Budget estimé", `${detail.budget_estime.toLocaleString("fr-FR")} MAD`]);
  }

  return {
    titre: "Rapport stage",
    sousTitre: detail.stage.stage_action,
    periodeLabel: formatPeriodePrint(detail.stage.date_debut, detail.stage.date_fin),
    mainTableTitle: "Synthèse",
    kpis: [
      { label: "Joueurs", value: String(detail.joueurs.length || detail.stage.nombre_joueurs), sub: "effectif" },
      { label: "Coachs", value: String(detail.coachs.length), sub: "encadrement" },
      {
        label: "Repas",
        value: detail.restauration ? String(detail.restauration.total) : "—",
        sub: "total estimé",
      },
      {
        label: "Budget",
        value:
          detail.budget_estime != null
            ? `${detail.budget_estime.toLocaleString("fr-FR")} MAD`
            : "—",
        sub: "estimé",
      },
    ],
    colonnes: ["Rubrique", "Valeur"],
    headerAlign: ["left", "left"],
    cellAlign: ["left", "left"],
    lignes,
  };
}

export type AnalyseOccupationData = {
  parInstallation30j: { nom: string; pct: number }[];
  stagesParMois: { mois: string; count: number }[];
  top3: { nom: string; pct: number }[];
  periodesCreuses: { semaine: string; pct: number }[];
};

export async function getAnalyseOccupationData(): Promise<AnalyseOccupationData> {
  const occ = await getOccupationCentre("mois");
  const parInstallation30j = occ.lignes
    .filter((l) => l.type === "terrain")
    .map((l) => ({ nom: l.nom, pct: l.pct }))
    .sort((a, b) => b.pct - a.pct);

  const stages = await getStagesProgramme();
  const now = new Date();
  const stagesParMois: { mois: string; count: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const count = stages.filter((s) => s.date_debut.slice(0, 7) === key).length;
    stagesParMois.push({
      mois: d.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" }),
      count,
    });
  }

  const top3 = parInstallation30j.slice(0, 3);
  const periodesCreuses = parInstallation30j
    .filter((x) => x.pct < 20)
    .map((x) => ({ semaine: x.nom, pct: x.pct }));

  return { parInstallation30j, stagesParMois, top3, periodesCreuses };
}

export type SyntheseParticipants = {
  totalJoueursUniques: number;
  moyenneJoueursParStage: number;
  totalJoursEntrainement: number;
  parCategorie: { categorie: string; count: number }[];
};

export async function getSyntheseParticipants(): Promise<SyntheseParticipants> {
  const summaries = await getStageProvisionSummaries();
  const joueurIds = new Set<string>();
  let totalJours = 0;
  let totalJoueursStage = 0;
  const catCount = new Map<string, number>();

  for (const { stage } of summaries) {
    const pack = parseLogistiqueFromNotes(stage.notes);
    for (const id of pack?.joueur_ids ?? []) joueurIds.add(id);
    totalJoueursStage += stage.nombre_joueurs;
    totalJours += calculateStageDuration(stage.date_debut, stage.date_fin);
    catCount.set(stage.categorie, (catCount.get(stage.categorie) ?? 0) + 1);
  }

  const n = summaries.length || 1;
  return {
    totalJoueursUniques: joueurIds.size,
    moyenneJoueursParStage: Math.round((totalJoueursStage / n) * 10) / 10,
    totalJoursEntrainement: totalJours,
    parCategorie: [...catCount.entries()].map(([categorie, count]) => ({
      categorie,
      count,
    })),
  };
}

export async function buildRapportMensuelMeta(): Promise<ReportMeta> {
  const stages = await getStagesProgramme();
  const mois = new Date().toISOString().slice(0, 7);
  const duMois = stages.filter((s) => s.date_debut.slice(0, 7) === mois);
  const lignes = duMois.map((s) => [
    s.stage_action,
    formatDatePrint(s.date_debut),
    formatDatePrint(s.date_fin),
    s.categorie,
    statutStageLabel(s.statut),
    String(s.nombre_joueurs),
  ]);
  const totalJ = duMois.reduce((s, x) => s + x.nombre_joueurs, 0);
  return {
    titre: "Rapport mensuel stages",
    sousTitre: mois,
    periodeLabel: mois,
    mainTableTitle: "Stages du mois",
    kpis: [
      { label: "Stages", value: String(duMois.length), sub: mois },
      { label: "Joueurs", value: String(totalJ), sub: "cumul" },
      {
        label: "Catégories",
        value: String(new Set(duMois.map((s) => s.categorie)).size),
        sub: "distinctes",
      },
      {
        label: "Hébergement",
        value: String(duMois.filter((s) => s.hebergement).length),
        sub: "stages",
      },
    ],
    colonnes: ["Stage", "Début", "Fin", "Catégorie", "Statut", "Joueurs"],
    lignes: lignes.length ? lignes : [["—", "—", "—", "—", "—", "0"]],
  };
}

export async function buildRapportAnnuelMeta(): Promise<ReportMeta> {
  const stages = await getStagesProgramme();
  const annee = String(new Date().getFullYear());
  const duAn = stages.filter((s) => s.date_debut.startsWith(annee));
  const lignes = duAn.map((s) => [
    s.stage_action,
    formatDatePrint(s.date_debut),
    s.categorie,
    statutStageLabel(s.statut),
  ]);
  const byCat = new Map<string, number>();
  for (const s of duAn) byCat.set(s.categorie, (byCat.get(s.categorie) ?? 0) + 1);
  const recapRows = [...byCat.entries()].map(([c, n]) => [
    c,
    String(n),
    duAn.length ? `${Math.round((n / duAn.length) * 100)}%` : "0%",
  ]);
  return {
    titre: `Rapport annuel stages ${annee}`,
    periodeLabel: `Année ${annee}`,
    mainTableTitle: "Stages de l'année",
    kpis: [
      { label: "Stages", value: String(duAn.length), sub: annee },
      {
        label: "Catégories",
        value: String(byCat.size),
        sub: "distinctes",
      },
      {
        label: "En cours",
        value: String(duAn.filter((s) => s.statut === "en_cours").length),
        sub: "statut",
      },
      {
        label: "Terminés",
        value: String(duAn.filter((s) => s.statut === "termine").length),
        sub: "statut",
      },
    ],
    colonnes: ["Stage", "Date début", "Catégorie", "Statut"],
    lignes: lignes.length ? lignes : [["—", "—", "—", "—"]],
    recap: recapRows.length
      ? {
          title: "Répartition par catégorie",
          colonnes: ["CATÉGORIE", "STAGES", "%"],
          lignes: recapRows,
          footer: [["TOTAL", String(duAn.length), duAn.length ? "100%" : "0%"]],
        }
      : undefined,
  };
}
