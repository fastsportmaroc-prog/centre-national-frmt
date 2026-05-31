import type { ReportMeta } from "@/lib/export/reports";
import { openPrintReport } from "@/lib/export/reports";
import type { RapportEntityData, ReportSectionKey } from "@/lib/rapports/types";
import { SECTION_LABELS } from "@/lib/rapports/types";
import type { StoredReportV2 } from "@/lib/v2/reports-storage";
import { formatPeriodeLabel } from "@/lib/v2/reports-storage";
import { RAPPORT_TYPE_LABELS } from "@/lib/rapports/types";

function mad(n: number): string {
  return `${n.toLocaleString("fr-FR")} MAD`;
}

function sectionEnabled(report: StoredReportV2, key: ReportSectionKey): boolean {
  return report.sections?.[key] !== false;
}

export function buildRapportPdfMeta(
  report: StoredReportV2,
  data: RapportEntityData
): ReportMeta {
  const sections: ReportMeta["sections"] = [];

  if (sectionEnabled(report, "resume_executif")) {
    sections.push({
      title: SECTION_LABELS.resume_executif,
      colonnes: ["Indicateur", "Valeur"],
      lignes: [
        ["Type", RAPPORT_TYPE_LABELS[report.type]],
        ["Période", formatPeriodeLabel(report.periode) || `${data.date_debut} → ${data.date_fin}`],
        ["Lieu", data.lieu],
        ["Catégorie", data.categorie],
        ["Statut", data.statut.replace(/_/g, " ")],
        ...(data.kind === "stage" && data.responsable
          ? [["Responsable", data.responsable] as string[]]
          : []),
      ],
    });
  }

  if (sectionEnabled(report, "participants") && data.participants.length) {
    sections.push({
      title: SECTION_LABELS.participants,
      colonnes: ["Nom", "Rôle", "Catégorie", "Présence"],
      lignes: data.participants.map((p) => [
        `${p.prenom} ${p.nom}`,
        p.role,
        p.categorie ?? "—",
        p.presence_pct != null ? `${p.presence_pct}%` : "—",
      ]),
    });
  }

  if (sectionEnabled(report, "restauration")) {
    const r = data.restauration;
    sections.push({
      title: SECTION_LABELS.restauration,
      colonnes: ["Poste", "Valeur"],
      lignes: [
        ["Période", `${r.date_debut} → ${r.date_fin}`],
        ["Petits-déjeuners", String(r.pdj)],
        ["Déjeuners", String(r.dej)],
        ["Dîners", String(r.diner)],
        ["Total repas", String(r.total_repas)],
        ["Montant", mad(r.montant_mad)],
      ],
    });
  }

  if (sectionEnabled(report, "hebergement")) {
    const h = data.hebergement;
    sections.push({
      title: SECTION_LABELS.hebergement,
      colonnes: ["Poste", "Valeur"],
      lignes: [
        ["Nuits", String(h.nuits)],
        ["Chambres joueurs", String(h.chambres_joueurs)],
        ["Chambres coaches", String(h.chambres_coachs)],
        ["Taux occupation", `${h.taux_occupation_pct}%`],
        ["Montant", mad(h.montant_mad)],
      ],
    });
  }

  if (sectionEnabled(report, "terrains")) {
    const t = data.terrains;
    sections.push({
      title: SECTION_LABELS.terrains,
      colonnes: ["Poste", "Valeur"],
      lignes: [
        ["Séances", String(t.seances)],
        ["Heures", String(t.heures)],
        ["Terrains", t.terrains_utilises.join(", ") || "—"],
        ["Montant", mad(t.montant_mad)],
      ],
    });
  }

  if (sectionEnabled(report, "kinesitherapie")) {
    const k = data.kinesitherapie;
    sections.push({
      title: SECTION_LABELS.kinesitherapie,
      colonnes: ["Poste", "Valeur"],
      lignes: [
        ["Séances", String(k.seances)],
        ["Joueurs suivis", String(k.joueurs_suivis)],
        ["Blessures signalées", String(k.blessures_signalees)],
        ["Notes", k.notes ?? "—"],
      ],
    });
  }

  if (sectionEnabled(report, "financier")) {
    const f = data.financier;
    sections.push({
      title: SECTION_LABELS.financier,
      colonnes: ["Poste", "Montant", "%"],
      lignes: f.repartition.map((r) => [r.label, mad(r.montant), `${r.pct}%`]),
      footer: [["TOTAL", mad(f.montant_total), "100%"]],
      cellAlign: ["left", "right", "center"],
    });
  }

  if (sectionEnabled(report, "resultats") && data.resultats.length) {
    sections.push({
      title: SECTION_LABELS.resultats,
      colonnes: ["Joueur", "Épreuve", "Résultat", "Classement"],
      lignes: data.resultats.map((r) => [
        r.joueur,
        r.epreuve ?? "—",
        r.resultat,
        r.classement ?? "—",
      ]),
    });
  }

  const obsParts: string[] = [];
  if (sectionEnabled(report, "recommandations")) {
    if (data.observations) obsParts.push(`Observations : ${data.observations}`);
    if (data.recommandations) obsParts.push(`Recommandations : ${data.recommandations}`);
    if (report.observations) obsParts.push(report.observations);
    if (report.recommandations) obsParts.push(report.recommandations);
  }

  return {
    titre: report.titre,
    sousTitre: `${data.lieu} — ${data.date_debut} au ${data.date_fin}`,
    colonnes: [],
    lignes: [],
    reference: `RPT-${report.id.slice(0, 8).toUpperCase()}`,
    generatedBy: report.generated_by,
    generatedRole: "Responsable logistique",
    kpis: data.kpis,
    metaRows: [
      [
        { label: "Type", value: RAPPORT_TYPE_LABELS[report.type] },
        { label: "Statut rapport", value: report.statut },
      ],
      [
        { label: "Entité", value: data.titre },
        { label: "Budget total", value: mad(data.financier.montant_total) },
      ],
    ],
    sections,
    observations: obsParts.length ? obsParts.join("\n\n") : undefined,
  };
}

export async function exportRapportPdf(
  report: StoredReportV2,
  data: RapportEntityData,
  mode: "print" | "download" = "print"
): Promise<void> {
  const meta = buildRapportPdfMeta(report, data);
  const filename = `rapport-${report.id.slice(0, 8)}.pdf`;
  if (mode === "print") {
    await openPrintReport(meta);
    return;
  }
  const { exportPdfReport } = await import("@/lib/export/reports");
  await exportPdfReport(meta, filename);
}

export async function printRapportPdf(report: StoredReportV2, data: RapportEntityData): Promise<void> {
  await exportRapportPdf(report, data, "print");
}
