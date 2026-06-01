import {
  getEntraineursByStage,
  getHebergementByStage,
  getJoueursByStage,
  getPlanningByStage,
  getRestaurationByStage,
  getStageById,
} from "@/lib/supabase/queries";
import { calcFacturationClub } from "@/lib/v2/logistique-operationnelle";
import { BUDGET_TARIFS_DEFAULTS } from "@/lib/v2/settings-store";
import { buildMealTotals } from "@/lib/v2/restauration-meals";
import { countDaysInclusive, countNightsHebergement } from "@/lib/v2/stage-calculations";
import { getJoueurDisplayCategorie } from "@/lib/utils/joueur";
import {
  getMockCompetitionReport,
  getMockStageU18Report,
  MOCK_COMPETITION_ID,
  MOCK_STAGE_U18_ID,
} from "@/lib/rapports/mock-data";
import { getPeriodReportData } from "@/lib/rapports/period-report";
import type {
  RapportEntityData,
  ReportSectionsConfig,
  StageReportData,
  CompetitionReportData,
} from "@/lib/rapports/types";
import type { StoredReportV2 } from "@/lib/v2/reports-storage";

function buildStageFromQueries(
  stage: NonNullable<Awaited<ReturnType<typeof getStageById>>>,
  joueurs: Awaited<ReturnType<typeof getJoueursByStage>>,
  coaches: Awaited<ReturnType<typeof getEntraineursByStage>>,
  hebergement: Awaited<ReturnType<typeof getHebergementByStage>>,
  restauration: Awaited<ReturnType<typeof getRestaurationByStage>>,
  planning: Awaited<ReturnType<typeof getPlanningByStage>>
): StageReportData {
  const finance = calcFacturationClub(
    { stage, hebergement, restauration, planning },
    BUDGET_TARIFS_DEFAULTS
  );

  let pdj = 0;
  let dej = 0;
  let diner = 0;
  if (restauration) {
    const jours = countDaysInclusive(restauration.date_debut, restauration.date_fin);
    const totals = buildMealTotals(restauration, jours);
    pdj = totals.pdj;
    dej = totals.dej;
    diner = totals.diner;
  }

  const nuits = countNightsHebergement(
    hebergement?.date_debut ?? stage.date_debut,
    hebergement?.date_fin ?? stage.date_fin
  );
  const nbChJ = hebergement?.nb_chambres_joueurs ?? hebergement?.chambres ?? 0;
  const nbChC = hebergement?.nb_chambres_coachs ?? 0;
  const montantKine = stage.kinesitherapie ? planning.length * 125 : 0;
  const montantTotal = finance.montantTotal + montantKine;

  const repartition = [
    { label: "Hébergement", montant: finance.montantHebergement, pct: 0 },
    { label: "Restauration", montant: finance.montantRestauration, pct: 0 },
    { label: "Terrains", montant: finance.montantTerrains, pct: 0 },
    ...(montantKine ? [{ label: "Kinésithérapie", montant: montantKine, pct: 0 }] : []),
  ].map((r) => ({
    ...r,
    pct: montantTotal ? Math.round((r.montant / montantTotal) * 100) : 0,
  }));

  return {
    kind: "stage",
    entity_id: stage.id,
    titre: stage.stage_action,
    categorie: stage.categorie,
    lieu: stage.lieu ?? "Complexe FRMT",
    date_debut: stage.date_debut,
    date_fin: stage.date_fin,
    statut: String(stage.statut),
    participants: [
      ...joueurs.map((j) => ({
        id: j.id,
        nom: j.nom,
        prenom: j.prenom,
        role: "joueur" as const,
        categorie: getJoueurDisplayCategorie(j, stage.categorie),
        sexe: j.sexe ?? undefined,
      })),
      ...coaches.map((c) => ({
        id: c.id,
        nom: c.nom,
        prenom: c.prenom,
        role: "entraineur" as const,
      })),
    ],
    restauration: {
      date_debut: restauration?.date_debut ?? stage.date_debut,
      date_fin: restauration?.date_fin ?? stage.date_fin,
      total_repas: restauration?.total_repas ?? pdj + dej + diner,
      pdj,
      dej,
      diner,
      montant_mad: finance.montantRestauration,
    },
    hebergement: {
      date_debut: hebergement?.date_debut ?? stage.date_debut,
      date_fin: hebergement?.date_fin ?? stage.date_fin,
      nuits,
      chambres_joueurs: nbChJ,
      chambres_coachs: nbChC,
      taux_occupation_pct: nbChJ + nbChC > 0 ? 85 : 0,
      montant_mad: finance.montantHebergement,
    },
    terrains: {
      seances: planning.length,
      heures: finance.heuresTerrains,
      terrains_utilises: stage.terrains ? ["Terrains FRMT"] : [],
      montant_mad: finance.montantTerrains,
    },
    kinesitherapie: {
      seances: stage.kinesitherapie ? Math.ceil(planning.length * 1.5) : 0,
      joueurs_suivis: stage.kinesitherapie ? joueurs.length : 0,
      blessures_signalees: 0,
    },
    financier: {
      montant_hebergement: finance.montantHebergement,
      montant_restauration: finance.montantRestauration,
      montant_terrains: finance.montantTerrains,
      montant_kinesitherapie: montantKine,
      montant_autres: 0,
      montant_total: montantTotal,
      repartition,
    },
    resultats: [],
    kpis: [
      { label: "Joueurs", value: String(joueurs.length) },
      { label: "Entraîneurs", value: String(coaches.length) },
      { label: "Séances", value: String(planning.length) },
      { label: "Budget total", value: `${montantTotal.toLocaleString("fr-FR")} MAD` },
    ],
  };
}

async function loadRealStageReport(stageId: string): Promise<StageReportData | null> {
  const stage = await getStageById(stageId);
  if (!stage) return null;

  const [joueurs, coaches, hebergement, restauration, planning] = await Promise.all([
    getJoueursByStage(stageId),
    getEntraineursByStage(stageId),
    getHebergementByStage(stageId),
    getRestaurationByStage(stageId),
    getPlanningByStage(stageId),
  ]);

  return buildStageFromQueries(stage, joueurs, coaches, hebergement, restauration, planning);
}

export async function getStageReportData(stageId: string): Promise<StageReportData> {
  if (stageId === MOCK_STAGE_U18_ID) {
    return getMockStageU18Report();
  }

  const data = await loadRealStageReport(stageId);
  return data ?? getMockStageU18Report();
}

export async function getCompetitionReportData(competitionId: string): Promise<CompetitionReportData> {
  if (competitionId === MOCK_COMPETITION_ID) {
    return getMockCompetitionReport();
  }

  try {
    const res = await fetch(`/api/competitions/${competitionId}`);
    if (res.ok) {
      const json = await res.json();
      const c = json.competition;
      if (c) {
        const mock = getMockCompetitionReport();
        return {
          ...mock,
          entity_id: c.id,
          titre: c.nom,
          categorie: c.categorie,
          lieu: c.lieu ?? mock.lieu,
          date_debut: c.date_debut,
          date_fin: c.date_fin,
          statut: c.statut ?? mock.statut,
        };
      }
    }
  } catch {
    /* fallback mock */
  }

  return getMockCompetitionReport();
}

export async function buildReportFromEntity(report: StoredReportV2): Promise<RapportEntityData | null> {
  const entityId = report.entity_id ?? report.stage_id;

  if (report.type === "competition") {
    const data = await getCompetitionReportData(entityId ?? MOCK_COMPETITION_ID);
    return {
      ...data,
      titre: report.titre,
      recommandations: report.recommandations ?? data.recommandations,
    };
  }

  if (report.type === "bilan_stage") {
    const data = await getStageReportData(entityId ?? MOCK_STAGE_U18_ID);
    return {
      ...data,
      recommandations: report.recommandations ?? data.recommandations,
    };
  }

  if (report.type === "hebdomadaire" || report.type === "mensuel" || report.type === "annuel") {
    const data = await getPeriodReportData(report, loadRealStageReport);
    return {
      ...data,
      titre: report.titre,
      recommandations: report.recommandations ?? data.recommandations,
    };
  }

  return null;
}

export function filterSectionsData<T extends RapportEntityData>(
  data: T,
  sections: ReportSectionsConfig
): Partial<T> {
  const out = { ...data } as Record<string, unknown>;
  if (!sections.participants) delete out.participants;
  if (!sections.restauration) delete out.restauration;
  if (!sections.hebergement) delete out.hebergement;
  if (!sections.terrains) delete out.terrains;
  if (!sections.kinesitherapie) delete out.kinesitherapie;
  if (!sections.financier) delete out.financier;
  if (!sections.resultats) delete out.resultats;
  return out as Partial<T>;
}
