"use client";

import { FRMTPdfEngine } from "@/lib/pdf/pdfEngine";
import {
  buildPdfFilename,
  formatDateFR,
  formatStagePdfSubtitle,
  formatStatutPdf,
  safePdfCell,
} from "@/lib/pdf/pdf-format";
import { loadPdfLogoBase64 } from "@/lib/pdf/load-pdf-logo";

export type FicheStagePdfInput = {
  stage_action: string;
  categorie: string;
  date_debut: string;
  date_fin: string;
  lieu?: string | null;
  statut: string;
  joueurs?: ({ nom: string; prenom: string; type?: string; categorie?: string } | string)[];
  coachs?: ({ nom: string; prenom: string } | string)[];
  hebergement?: Record<string, string>[] | string;
  restauration?: Record<string, string>[] | string;
  terrains?: Record<string, string>[] | string;
  kinesitherapie?: string;
  checklist_pct?: number;
};

function daysBetween(debut: string, fin: string): number {
  const a = new Date(`${debut.slice(0, 10)}T12:00:00`);
  const b = new Date(`${fin.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 1;
  return Math.max(1, Math.round((b.getTime() - a.getTime()) / 86400000) + 1);
}

function tableColWidths(keys: string[]): number[] {
  const n = keys.length;
  if (n === 2 && keys[0] === "Champ" && keys[1] === "Valeur") {
    return [52, 130];
  }
  if (n === 6 && keys.includes("Terrain") && keys.includes("Créneau")) {
    return [42, 38, 34, 22, 18, 28];
  }
  const base = 182 / n;
  return keys.map(() => base);
}

function tableFromRows(rows: Record<string, string>[] | undefined, title: string, engine: FRMTPdfEngine) {
  if (!rows?.length) {
    engine.sectionTitle(title);
    engine.paragraph("—");
    return;
  }
  const keys = Object.keys(rows[0]!);
  engine.sectionTitle(title);
  engine.table({
    headers: keys,
    rows: rows.map((r) => keys.map((k) => safePdfCell(r[k]))),
    colWidths: tableColWidths(keys),
    wrapText: true,
  });
}

export async function generateFicheStagePDF(stage: FicheStagePdfInput): Promise<void> {
  const logo = await loadPdfLogoBase64();
  const jours = daysBetween(stage.date_debut, stage.date_fin);
  const participants =
    stage.joueurs?.map((j, i) => {
      if (typeof j === "string") {
        const parts = j.split(" ");
        return [String(i + 1), parts.slice(1).join(" ") || j, parts[0] ?? "", "Joueur", "—", "—"];
      }
      return [
        String(i + 1),
        j.nom,
        j.prenom,
        j.type ?? "Joueur",
        j.categorie ?? "—",
        "—",
      ];
    }) ?? [];

  const nbJoueurs = participants.length;
  const nbCoachs = stage.coachs?.length ?? 0;

  const engine = new FRMTPdfEngine(`Fiche Stage — ${stage.stage_action}`);
  engine.drawHeader({
    documentType: "FICHE DE STAGE",
    stageName: stage.stage_action,
    subtitle: formatStagePdfSubtitle(stage.date_debut, stage.date_fin, jours, stage.categorie),
    date: `Généré le ${formatDateFR(new Date().toISOString())}`,
    logoBase64: logo,
  });

  engine.kpiRow([
    { label: "Joueurs", value: String(nbJoueurs), color: "#2B6CB0" },
    { label: "Coachs", value: String(nbCoachs), color: "#276749" },
    { label: "Total", value: String(nbJoueurs + nbCoachs), color: "#2D3748" },
    { label: "Jours", value: String(jours), color: "#B7791F" },
    ...(stage.checklist_pct != null
      ? [{ label: "Checklist", value: `${stage.checklist_pct}%`, color: "#C53030" }]
      : []),
  ]);

  engine.sectionTitle("Informations générales");
  engine.infoGrid([
    { label: "Nom du stage", value: stage.stage_action },
    { label: "Statut", value: formatStatutPdf(stage.statut) },
    { label: "Date début", value: formatDateFR(stage.date_debut) },
    { label: "Date fin", value: formatDateFR(stage.date_fin) },
    { label: "Catégorie", value: stage.categorie },
    { label: "Lieu", value: safePdfCell(stage.lieu) },
  ]);

  engine.sectionTitle("Participants");
  engine.table({
    headers: ["#", "Nom", "Prénom", "Type", "Catégorie", "Statut"],
    colWidths: [10, 38, 35, 25, 28, 46],
    wrapText: true,
    rows:
      participants.length ?
        participants
      : [["—", "—", "—", "—", "—", "—"]],
  });

  if (typeof stage.hebergement === "string" && stage.hebergement) {
    engine.sectionTitle("Hébergement");
    engine.paragraph(stage.hebergement);
  } else {
    tableFromRows(
      Array.isArray(stage.hebergement) ? stage.hebergement : undefined,
      "Détail hébergement",
      engine
    );
  }

  if (typeof stage.restauration === "string" && stage.restauration) {
    engine.sectionTitle("Restauration");
    engine.paragraph(stage.restauration);
  } else {
    tableFromRows(
      Array.isArray(stage.restauration) ? stage.restauration : undefined,
      "Détail restauration",
      engine
    );
  }

  if (typeof stage.terrains === "string" && stage.terrains) {
    engine.sectionTitle("Terrains");
    engine.paragraph(stage.terrains);
  } else {
    tableFromRows(
      Array.isArray(stage.terrains) ? stage.terrains : undefined,
      "Détail terrains",
      engine
    );
  }

  if (stage.kinesitherapie) {
    engine.sectionTitle("Kinésithérapie");
    engine.paragraph(stage.kinesitherapie);
  }

  engine.save(buildPdfFilename("STAGE", stage.stage_action, stage.date_debut));
}
