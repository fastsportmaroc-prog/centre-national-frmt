import { getStages } from "@/lib/supabase/queries";
import { formatPeriodeLabel } from "@/lib/v2/reports-storage";
import { MOCK_STAGE_U18_ID } from "@/lib/rapports/mock-data";
import type {
  ParticipantResume,
  RapportType,
  StageReportData,
} from "@/lib/rapports/types";
import { RAPPORT_TYPE_LABELS } from "@/lib/rapports/types";
import type { StoredReportV2 } from "@/lib/v2/reports-storage";
import type { StageProgrammeV2 } from "@/lib/types/v2";

export function stageOverlapsPeriod(
  stage: Pick<StageProgrammeV2, "date_debut" | "date_fin">,
  debut: string,
  fin: string
): boolean {
  return stage.date_debut <= fin && stage.date_fin >= debut;
}

function isDemoStageId(id: string): boolean {
  return id === MOCK_STAGE_U18_ID || id.startsWith("mock-");
}

function uniqueLabels(values: string[], fallback: string): string {
  const unique = [...new Set(values.map((v) => v.trim()).filter(Boolean))];
  if (unique.length === 0) return fallback;
  if (unique.length === 1) return unique[0];
  return unique.join(", ");
}

function aggregateStatut(statuts: string[]): string {
  if (!statuts.length) return "aucune_activite";
  const unique = new Set(statuts);
  if (unique.size === 1) return statuts[0];
  if ([...unique].every((s) => s === "termine")) return "termine";
  return "mixte";
}

function dedupeParticipants(reports: StageReportData[]): ParticipantResume[] {
  const map = new Map<string, ParticipantResume>();
  for (const report of reports) {
    for (const p of report.participants) {
      const key = `${p.role}:${p.id}`;
      const prev = map.get(key);
      if (!prev) {
        map.set(key, { ...p, presence_pct: undefined });
        continue;
      }
      if (p.categorie && p.categorie !== "—" && (!prev.categorie || prev.categorie === "—")) {
        prev.categorie = p.categorie;
      }
    }
  }
  return [...map.values()].sort((a, b) =>
    `${a.nom}${a.prenom}`.localeCompare(`${b.nom}${b.prenom}`, "fr")
  );
}

function buildFinancier(reports: StageReportData[]) {
  const montant_hebergement = reports.reduce((s, r) => s + r.financier.montant_hebergement, 0);
  const montant_restauration = reports.reduce((s, r) => s + r.financier.montant_restauration, 0);
  const montant_terrains = reports.reduce((s, r) => s + r.financier.montant_terrains, 0);
  const montant_kinesitherapie = reports.reduce(
    (s, r) => s + r.financier.montant_kinesitherapie,
    0
  );
  const montant_autres = reports.reduce((s, r) => s + r.financier.montant_autres, 0);
  const montant_total =
    montant_hebergement +
    montant_restauration +
    montant_terrains +
    montant_kinesitherapie +
    montant_autres;

  const buckets = [
    { label: "Hébergement", montant: montant_hebergement },
    { label: "Restauration", montant: montant_restauration },
    { label: "Terrains", montant: montant_terrains },
    ...(montant_kinesitherapie ? [{ label: "Kinésithérapie", montant: montant_kinesitherapie }] : []),
    ...(montant_autres ? [{ label: "Autres", montant: montant_autres }] : []),
  ];

  const repartition = buckets
    .filter((b) => b.montant > 0)
    .map((b) => ({
      ...b,
      pct: montant_total ? Math.round((b.montant / montant_total) * 100) : 0,
    }));

  return {
    montant_hebergement,
    montant_restauration,
    montant_terrains,
    montant_kinesitherapie,
    montant_autres,
    montant_total,
    repartition,
  };
}

export function buildEmptyPeriodReport(report: StoredReportV2): StageReportData {
  const debut = report.periode?.debut ?? "";
  const fin = report.periode?.fin ?? "";
  const periodLabel = formatPeriodeLabel(report.periode);

  return {
    kind: "stage",
    entity_id: debut && fin ? `period:${debut}:${fin}` : report.id,
    titre: report.titre,
    categorie: "—",
    lieu: "—",
    date_debut: debut || "—",
    date_fin: fin || "—",
    statut: "aucune_activite",
    participants: [],
    restauration: {
      date_debut: debut,
      date_fin: fin,
      total_repas: 0,
      pdj: 0,
      dej: 0,
      diner: 0,
      montant_mad: 0,
    },
    hebergement: {
      date_debut: debut,
      date_fin: fin,
      nuits: 0,
      chambres_joueurs: 0,
      chambres_coachs: 0,
      taux_occupation_pct: 0,
      montant_mad: 0,
    },
    terrains: {
      seances: 0,
      heures: 0,
      terrains_utilises: [],
      montant_mad: 0,
    },
    kinesitherapie: {
      seances: 0,
      joueurs_suivis: 0,
      blessures_signalees: 0,
    },
    financier: {
      montant_hebergement: 0,
      montant_restauration: 0,
      montant_terrains: 0,
      montant_kinesitherapie: 0,
      montant_autres: 0,
      montant_total: 0,
      repartition: [],
    },
    resultats: [],
    kpis: buildPeriodKpis(report.type, periodLabel, 0, 0),
    recommandations: report.recommandations,
  };
}

export function buildPeriodKpis(
  type: RapportType,
  periodLabel: string,
  stageCount: number,
  budgetTotal: number,
  joueurs = 0,
  entraineurs = 0
) {
  return [
    { label: "Type", value: RAPPORT_TYPE_LABELS[type] },
    { label: "Période", value: periodLabel },
    { label: "Stages", value: String(stageCount) },
    { label: "Budget", value: `${budgetTotal.toLocaleString("fr-FR")} MAD` },
    ...(joueurs || entraineurs
      ? [
          { label: "Joueurs", value: String(joueurs), sub: "uniques sur période" },
          { label: "Entraîneurs", value: String(entraineurs) },
        ]
      : []),
  ];
}

export function aggregateStageReports(
  reports: StageReportData[],
  report: StoredReportV2
): StageReportData {
  if (!report.periode?.debut || !report.periode?.fin) {
    return buildEmptyPeriodReport(report);
  }

  const { debut, fin } = report.periode;
  const periodLabel = formatPeriodeLabel(report.periode);

  if (reports.length === 0) {
    return buildEmptyPeriodReport(report);
  }

  const participants = dedupeParticipants(reports);
  const joueurs = participants.filter((p) => p.role === "joueur");
  const staff = participants.filter((p) => p.role !== "joueur");
  const financier = buildFinancier(reports);

  const restauration = {
    date_debut: reports.reduce((min, r) => (r.restauration.date_debut < min ? r.restauration.date_debut : min), reports[0].restauration.date_debut),
    date_fin: reports.reduce((max, r) => (r.restauration.date_fin > max ? r.restauration.date_fin : max), reports[0].restauration.date_fin),
    pdj: reports.reduce((s, r) => s + r.restauration.pdj, 0),
    dej: reports.reduce((s, r) => s + r.restauration.dej, 0),
    diner: reports.reduce((s, r) => s + r.restauration.diner, 0),
    total_repas: reports.reduce((s, r) => s + r.restauration.total_repas, 0),
    montant_mad: reports.reduce((s, r) => s + r.restauration.montant_mad, 0),
  };

  const hebergementNuits = reports.reduce((s, r) => s + r.hebergement.nuits, 0);
  const hebergement = {
    date_debut: debut,
    date_fin: fin,
    nuits: hebergementNuits,
    chambres_joueurs: reports.reduce((s, r) => s + r.hebergement.chambres_joueurs, 0),
    chambres_coachs: reports.reduce((s, r) => s + r.hebergement.chambres_coachs, 0),
    taux_occupation_pct: hebergementNuits
      ? Math.round(
          reports.reduce(
            (s, r) => s + r.hebergement.taux_occupation_pct * r.hebergement.nuits,
            0
          ) / hebergementNuits
        )
      : 0,
    montant_mad: reports.reduce((s, r) => s + r.hebergement.montant_mad, 0),
  };

  const terrains = {
    seances: reports.reduce((s, r) => s + r.terrains.seances, 0),
    heures: reports.reduce((s, r) => s + r.terrains.heures, 0),
    terrains_utilises: [
      ...new Set(reports.flatMap((r) => r.terrains.terrains_utilises)),
    ],
    montant_mad: reports.reduce((s, r) => s + r.terrains.montant_mad, 0),
  };

  const kinesitherapie = {
    seances: reports.reduce((s, r) => s + r.kinesitherapie.seances, 0),
    joueurs_suivis: reports.reduce((s, r) => s + r.kinesitherapie.joueurs_suivis, 0),
    blessures_signalees: reports.reduce(
      (s, r) => s + r.kinesitherapie.blessures_signalees,
      0
    ),
  };

  const resultats = reports.flatMap((r) => r.resultats);

  return {
    kind: "stage",
    entity_id: `period:${debut}:${fin}`,
    titre: report.titre,
    categorie: uniqueLabels(reports.map((r) => r.categorie), "—"),
    lieu: uniqueLabels(reports.map((r) => r.lieu), "—"),
    date_debut: debut,
    date_fin: fin,
    statut: aggregateStatut(reports.map((r) => r.statut)),
    participants,
    restauration,
    hebergement,
    terrains,
    kinesitherapie,
    financier,
    resultats,
    kpis: buildPeriodKpis(
      report.type,
      periodLabel,
      reports.length,
      financier.montant_total,
      joueurs.length,
      staff.length
    ),
    recommandations: report.recommandations,
  };
}

export async function getPeriodReportData(
  report: StoredReportV2,
  loadStage: (stageId: string) => Promise<StageReportData | null>
): Promise<StageReportData> {
  if (!report.periode?.debut || !report.periode?.fin) {
    return buildEmptyPeriodReport(report);
  }

  const { debut, fin } = report.periode;
  const stages = await getStages();
  const matching = stages.filter(
    (s) => !isDemoStageId(s.id) && stageOverlapsPeriod(s, debut, fin)
  );

  const stageReports = (
    await Promise.all(matching.map((s) => loadStage(s.id)))
  ).filter((r): r is StageReportData => r !== null);

  return aggregateStageReports(stageReports, report);
}
