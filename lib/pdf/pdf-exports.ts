"use client";

import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { fr } from "date-fns/locale";
import {
  FRMT,
  generateFRMTPDF,
  getCategoryPdfColor,
  type PDFConfig,
  type PdfColumnDef,
  type PdfSectionDef,
} from "@/lib/pdf/pdfGenerator";
import {
  buildPdfFilename,
  formatCreneauPdf,
  formatDateFR,
  formatMoneyEUR,
  formatMoneyMAD,
  formatStatutPdf,
  safePdfCell,
} from "@/lib/pdf/pdf-format";
import { getCategoryStyle } from "@/lib/v2/category-colors";
import type { BudgetVoyageForm } from "@/lib/v2/budget-voyage";
import { computeBudgetTotals } from "@/lib/v2/budget-voyage";
import { formatDateLong, getCreneauInfo, surfaceLabel } from "@/lib/v2/reservations-utils";
import type { ReservationEnrichedV2 } from "@/lib/types/v2";
import type { jsPDF } from "jspdf";

function hexRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

async function runFrmPdf(config: PDFConfig): Promise<void> {
  await generateFRMTPDF(config);
}

export function exportStagePDF(stage: {
  stage_action: string;
  categorie: string;
  date_debut: string;
  date_fin: string;
  lieu?: string | null;
  statut: string;
  notes?: string | null;
  joueurs?: ({ nom: string; prenom: string; type?: string; categorie?: string } | string)[];
  coachs?: ({ nom: string; prenom: string } | string)[];
  hebergement?: Record<string, string>[] | string;
  restauration?: Record<string, string>[] | string;
  terrains?: Record<string, string>[] | string;
  kinesitherapie?: string;
}) {
  const participants =
    stage.joueurs?.map((j, i) => {
      if (typeof j === "string") {
        const parts = j.split(" ");
        return {
          num: String(i + 1),
          nom: parts.slice(1).join(" ") || j,
          prenom: parts[0] ?? "",
          type: "Joueur",
          categorie: "—",
          statut: "—",
        };
      }
      return {
        num: String(i + 1),
        nom: j.nom,
        prenom: j.prenom,
        type: j.type ?? "Joueur",
        categorie: j.categorie ?? "—",
        statut: "—",
      };
    }) ?? [];

  const sections: PdfSectionDef[] = [];
  if (Array.isArray(stage.hebergement) && stage.hebergement.length) {
    sections.push({
      title: "Hébergement",
      columns: Object.keys(stage.hebergement[0]!).map((k) => ({ header: k, key: k })),
      data: stage.hebergement,
    });
  }
  if (Array.isArray(stage.restauration) && stage.restauration.length) {
    sections.push({
      title: "Restauration",
      columns: Object.keys(stage.restauration[0]!).map((k) => ({ header: k, key: k })),
      data: stage.restauration,
    });
  }
  if (Array.isArray(stage.terrains) && stage.terrains.length) {
    sections.push({
      title: "Terrains",
      columns: Object.keys(stage.terrains[0]!).map((k) => ({ header: k, key: k })),
      data: stage.terrains,
    });
  }

  return runFrmPdf({
    title: "Fiche de Stage",
    subtitle: stage.stage_action,
    periode: `Du ${formatDateFR(stage.date_debut)} au ${formatDateFR(stage.date_fin)}`,
    categorieColor: getCategoryPdfColor(stage.categorie),
    filename: buildPdfFilename("STAGE", stage.stage_action, stage.date_debut),
    columns: [
      { header: "#", key: "num", width: 8, align: "center" },
      { header: "Nom", key: "nom", width: 35, align: "left" },
      { header: "Prénom", key: "prenom", width: 35, align: "left" },
      { header: "Type", key: "type", width: 20, align: "center" },
      { header: "Catégorie", key: "categorie", width: 20, align: "center" },
      { header: "Statut", key: "statut", width: 20, align: "center" },
    ],
    data: participants.length ? participants : [{ num: "—", nom: "—", prenom: "—", type: "—", categorie: "—", statut: "—" }],
    sections,
    extraSections: [
      {
        title: "Informations générales",
        content: `Lieu : ${safePdfCell(stage.lieu)} | Catégorie : ${stage.categorie} | Statut : ${formatStatutPdf(stage.statut)}${stage.notes ? ` | Notes : ${stage.notes}` : ""}`,
      },
      ...(typeof stage.hebergement === "string"
        ? [{ title: "Hébergement", content: stage.hebergement }]
        : []),
      ...(typeof stage.restauration === "string"
        ? [{ title: "Restauration", content: stage.restauration }]
        : []),
      ...(typeof stage.terrains === "string" ? [{ title: "Terrains", content: stage.terrains }] : []),
      ...(typeof stage.kinesitherapie === "string"
        ? [{ title: "Kinésithérapie", content: stage.kinesitherapie }]
        : []),
    ],
    generatedBy: "Utilisateur FRMT",
    appVersion: "FRMT V2",
  });
}

function mapJoueurRowToPdf(row: Record<string, string>, index: number): Record<string, string> {
  return {
    num: safePdfCell(row["#"] ?? row.num ?? String(index + 1)),
    nom: safePdfCell(row.Nom ?? row.nom),
    prenom: safePdfCell(row["Prénom"] ?? row.Prenom ?? row.prenom),
    sexe: safePdfCell(row.Sexe ?? row.sexe),
    categorie: safePdfCell(row["Catégorie"] ?? row.Categorie ?? row.categorie),
    naissance: safePdfCell(row["Né le"] ?? row.naissance),
    age: safePdfCell(row["Âge"] ?? row.Age ?? row.age),
    club: safePdfCell(row.Club ?? row.club),
    statut: safePdfCell(formatStatutPdf(row.Statut ?? row.statut ?? "actif")),
  };
}

const JOUEURS_PDF_COLUMNS: PdfColumnDef[] = [
  { header: "#", key: "num", width: 10, align: "center" },
  { header: "Nom", key: "nom", width: 34, align: "left" },
  { header: "Prénom", key: "prenom", width: 34, align: "left" },
  { header: "Sexe", key: "sexe", width: 14, align: "center" },
  { header: "Catégorie", key: "categorie", width: 24, align: "center" },
  { header: "Né le", key: "naissance", width: 26, align: "center" },
  { header: "Âge", key: "age", width: 12, align: "center" },
  { header: "Club", key: "club", width: 48, align: "left" },
  { header: "Statut", key: "statut", width: 22, align: "center" },
];

export function exportJoueursPDF(joueurs: Record<string, string>[], filtres?: string) {
  const source = joueurs.length ? joueurs : [{}];
  const data = source.map((row, i) => mapJoueurRowToPdf(row, i));

  return runFrmPdf({
    title: "Liste des joueurs",
    subtitle: filtres ? `Filtres : ${filtres}` : "Effectif national — Centre National FRMT",
    orientation: "landscape",
    filename: buildPdfFilename("JOUEURS", "liste", new Date().toISOString().slice(0, 10)),
    columns: JOUEURS_PDF_COLUMNS,
    data,
    footerNote: "Document généré par FRMT Centre National V2",
    generatedBy: "Utilisateur FRMT",
    appVersion: "FRMT V2",
  });
}

export function exportEntraineursPDF(entraineurs: Record<string, string>[]) {
  const keys = Object.keys(entraineurs[0] ?? { nom: "" });
  return runFrmPdf({
    title: "Liste des entraîneurs",
    filename: "entraineurs.pdf",
    columns: keys.map((k) => ({ header: k, key: k })),
    data: entraineurs,
  });
}

export function exportReservationsPDF(
  reservations: ReservationEnrichedV2[],
  subtitle?: string
) {
  const moisLabel = format(new Date(), "MMMM", { locale: fr });
  const annee = new Date().getFullYear();
  const data = [...reservations]
    .sort((a, b) => a.date_debut.localeCompare(b.date_debut))
    .map((r) => {
      const c = getCreneauInfo(r.date_debut, r.date_fin, r.creneau);
      const surf = surfaceLabel(r.court_surface);
      const short =
        surf === "Terre battue" ? "TB" : surf === "Dur" ? "D" : surf === "Gazon" ? "G" : "";
      return {
        date: formatDateLong(
          r.date_debut.includes("T") ? r.date_debut : `${r.date_debut}T12:00:00`
        ),
        creneau: formatCreneauPdf(c.type),
        infra: `${r.court_nom ?? "—"}${short ? ` (${short})` : ""}`,
        surface: surf,
        stage: safePdfCell(r.stage_nom),
        statut: formatStatutPdf(r.statut ?? "prevu"),
      };
    });

  return runFrmPdf({
    title: "Planning des Réservations",
    subtitle: subtitle ?? undefined,
    periode: `${moisLabel} ${annee}`,
    filename: `Reservations_${moisLabel}_${annee}.pdf`,
    columns: [
      { header: "Date", key: "date", width: 28, align: "center" },
      { header: "Créneau", key: "creneau", width: 32, align: "center" },
      { header: "Infrastructure", key: "infra", width: 35, align: "left" },
      { header: "Surface", key: "surface", width: 22, align: "center" },
      { header: "Stage", key: "stage", width: 40, align: "left" },
      { header: "Statut", key: "statut", width: 18, align: "center" },
    ],
    data,
    footerNote: `Total : ${reservations.length} réservation(s) — FRMT`,
    generatedBy: "Utilisateur FRMT",
    appVersion: "FRMT V2",
  });
}

export function exportBilletsPdf(
  rows: (string | number)[][],
  totalMad: number,
  _devise = "MAD",
  stageName?: string
) {
  const headers = ["Nom", "Prénom", "Type", "Départ", "Retour", "Prix (MAD)"];
  const data = rows.map((r) =>
    Object.fromEntries(headers.map((h, j) => [h, String(r[j] ?? "—")]))
  );
  exportBilletsPDF(data, totalMad, stageName);
}

export function exportBilletsPDF(
  rows: Record<string, string>[],
  totalMad: number,
  stageName?: string
) {
  const keys = Object.keys(rows[0] ?? { nom: "" });
  return runFrmPdf({
    title: "Demandes de billets d'avion",
    subtitle: stageName,
    filename: "billets-avion.pdf",
    columns: keys.map((k) => ({ header: k, key: k })),
    data: rows,
    footerNote: `TOTAL — ${rows.length} billet(s) — ${formatMoneyMAD(totalMad)}`,
  });
}

export function exportBudgetAnnuelPDF(
  annee: number,
  lignes: Record<string, string>[],
  totaux: { alloue: number; reel: number; engage: number }
) {
  const keys = Object.keys(lignes[0] ?? { categorie: "" });
  return runFrmPdf({
    title: "Budget annuel",
    subtitle: `Exercice ${annee}`,
    filename: `budget-annuel-${annee}.pdf`,
    showSignataires: true,
    legacyTableStyle: true,
    columns: keys.map((k) => ({ header: k, key: k })),
    data: lignes,
    sections: [
      {
        title: "Totaux",
        columns: [
          { header: "Poste", key: "poste", width: 50 },
          { header: "Montant (MAD)", key: "montant", width: 40, align: "right" },
        ],
        data: [
          { poste: "Total alloué", montant: totaux.alloue.toLocaleString("fr-FR") },
          { poste: "Total engagé", montant: totaux.engage.toLocaleString("fr-FR") },
          { poste: "Total réel", montant: totaux.reel.toLocaleString("fr-FR") },
        ],
      },
    ],
  });
}

export function exportBudgetMissionPDF(
  stageName: string,
  dateDebut: string,
  dateFin: string,
  form: BudgetVoyageForm
) {
  const t = computeBudgetTotals(form);
  const recapRows = [
    { poste: "Taux EUR/MAD", valeur: form.taux_eur_mad.toLocaleString("fr-FR", { minimumFractionDigits: 2 }), _isTotal: false },
    { poste: "Total Transport", valeur: formatMoneyEUR(t.transport), _isTotal: false },
    { poste: "Total Hébergement", valeur: formatMoneyEUR(t.hebergement), _isTotal: false },
    { poste: "Total Restauration", valeur: formatMoneyEUR(t.restauration), _isTotal: false },
    { poste: "Total Divers", valeur: formatMoneyEUR(t.divers), _isTotal: false },
    {
      poste: "TOTAL GÉNÉRAL",
      valeur: `${formatMoneyEUR(t.totalEur)} / ${formatMoneyMAD(t.totalMad)}`,
      _isTotal: true,
    },
  ];

  return runFrmPdf({
    title: "Budget Prévisionnel",
    subtitle: stageName,
    periode: `Du ${formatDateFR(dateDebut)} au ${formatDateFR(dateFin)}`,
    filename: buildPdfFilename("BUDGET", stageName, dateDebut),
    showSignataires: true,
    legacyTableStyle: true,
    sections: [
      {
        title: "Transport",
        columns: [
          { header: "Type", key: "type" },
          { header: "Bénéficiaires", key: "benef" },
          { header: "Nb", key: "nb", align: "center" },
          { header: "Prix unit.", key: "pu", align: "right" },
          { header: "Total", key: "total", align: "right" },
        ],
        data: [
          {
            type: form.transport_type,
            benef: "Billets joueurs",
            nb: String(form.nb_billets_joueurs),
            pu: formatMoneyEUR(form.prix_billet_joueur),
            total: formatMoneyEUR(form.nb_billets_joueurs * form.prix_billet_joueur),
          },
          {
            type: form.transport_type,
            benef: "Billets coachs",
            nb: String(form.nb_billets_coachs),
            pu: formatMoneyEUR(form.prix_billet_coach),
            total: formatMoneyEUR(form.nb_billets_coachs * form.prix_billet_coach),
          },
        ],
      },
      {
        title: "Hébergement",
        columns: [
          { header: "Établissement", key: "etab" },
          { header: "Nb nuits", key: "nuits", align: "center" },
          { header: "Nb chambres", key: "ch", align: "center" },
          { header: "Prix/nuit", key: "pn", align: "right" },
          { header: "Total", key: "total", align: "right" },
        ],
        data: [
          {
            etab: "Hébergement mission",
            nuits: String(form.nb_nuits),
            ch: `${form.nb_chambres_single} single / ${form.nb_chambres_double} double`,
            pn: `${formatMoneyEUR(form.prix_chambre_single)} / ${formatMoneyEUR(form.prix_chambre_double)}`,
            total: formatMoneyEUR(t.hebergement),
          },
        ],
      },
      {
        title: "Restauration",
        columns: [
          { header: "Type repas", key: "type" },
          { header: "Nb repas", key: "nb", align: "center" },
          { header: "Prix/repas", key: "pr", align: "right" },
          { header: "Total", key: "total", align: "right" },
        ],
        data: [
          {
            type: "Petit déjeuner",
            nb: String(form.total_repas_petit_dejeuner),
            pr: formatMoneyEUR(form.prix_petit_dejeuner),
            total: formatMoneyEUR(form.total_repas_petit_dejeuner * form.prix_petit_dejeuner),
          },
          {
            type: "Déjeuner",
            nb: String(form.total_repas_dejeuner),
            pr: formatMoneyEUR(form.prix_dejeuner),
            total: formatMoneyEUR(form.total_repas_dejeuner * form.prix_dejeuner),
          },
          {
            type: "Dîner",
            nb: String(form.total_repas_diner),
            pr: formatMoneyEUR(form.prix_diner),
            total: formatMoneyEUR(form.total_repas_diner * form.prix_diner),
          },
        ],
      },
      {
        title: "Divers",
        columns: [
          { header: "Description", key: "desc" },
          { header: "Catégorie", key: "cat" },
          { header: "Montant EUR", key: "eur", align: "right" },
          { header: "Montant MAD", key: "mad", align: "right" },
        ],
        data:
          form.divers_lignes.length > 0
            ? form.divers_lignes.map((l) => ({
                desc: l.description,
                cat: l.categorie,
                eur: formatMoneyEUR(l.montant_eur),
                mad: formatMoneyMAD(l.montant_eur * form.taux_eur_mad),
              }))
            : [{ desc: "—", cat: "—", eur: formatMoneyEUR(0), mad: formatMoneyMAD(0) }],
      },
      {
        title: "Récapitulatif",
        columns: [
          { header: "Poste", key: "poste", width: 50 },
          { header: "Montant", key: "valeur", width: 50, align: "right" },
        ],
        data: recapRows,
      },
    ],
    columns: [],
    data: [],
  });
}

/** Synthèse budgets stages CNE — montants MAD (signataires FRMT). */
export function exportStagesCneBudgetPdf(
  annee: number,
  rows: {
    stage: string;
    categorie: string;
    periode: string;
    hebergement: string;
    restauration: string;
    terrains: string;
    total: string;
  }[],
  totals: { hebergement: number; restauration: number; terrains: number; total: number }
) {
  return runFrmPdf({
    title: "Coût des stages — FRMT",
    subtitle: `Synthèse ${annee} — montants en MAD`,
    filename: buildPdfFilename("BUDGET-CNE", String(annee), `${annee}-01-01`),
    showSignataires: true,
    legacyTableStyle: true,
    sections: [
      {
        title: "Estimation par stage",
        columns: [
          { header: "Stage", key: "stage", width: 28 },
          { header: "Période", key: "periode", width: 22 },
          { header: "Hébergement", key: "hebergement", width: 14, align: "right" },
          { header: "Restauration", key: "restauration", width: 14, align: "right" },
          { header: "Terrains", key: "terrains", width: 12, align: "right" },
          { header: "Total MAD", key: "total", width: 14, align: "right" },
        ],
        data: rows,
      },
      {
        title: "Total annuel",
        columns: [
          { header: "Poste", key: "poste", width: 50 },
          { header: "Montant MAD", key: "montant", width: 50, align: "right" },
        ],
        data: [
          { poste: "Hébergement", montant: formatMoneyMAD(totals.hebergement) },
          { poste: "Restauration", montant: formatMoneyMAD(totals.restauration) },
          { poste: "Terrains", montant: formatMoneyMAD(totals.terrains) },
          { poste: "TOTAL", montant: formatMoneyMAD(totals.total), _isTotal: true },
        ],
      },
    ],
    columns: [],
    data: [],
  });
}

/** @deprecated Utiliser exportBudgetMissionPDF */
export function exportBudgetVoyagePDF(data: {
  stage: string;
  periode: string;
  lignes: Record<string, string>[];
  totalEur: number;
  totalMad: number;
}) {
  void data.lignes;
  const parts = data.periode.split("→").map((s) => s.trim());
  exportBudgetMissionPDF(
    data.stage,
    parts[0] ?? new Date().toISOString().slice(0, 10),
    parts[1] ?? parts[0] ?? new Date().toISOString().slice(0, 10),
    {
      stage_id: "",
      transport_type: "avion",
      nb_billets_joueurs: 0,
      prix_billet_joueur: 0,
      nb_billets_coachs: 0,
      prix_billet_coach: 0,
      nb_nuits: 0,
      nb_chambres_joueurs: 0,
      nb_chambres_coachs: 0,
      nb_chambres_single: 0,
      nb_chambres_double: 0,
      total_repas_petit_dejeuner: 0,
      total_repas_dejeuner: 0,
      total_repas_diner: 0,
      prix_petit_dejeuner: 0,
      prix_dejeuner: 0,
      prix_diner: 0,
      prix_chambre_single: 0,
      prix_chambre_double: 0,
      taux_eur_mad: 10.8,
      divers_lignes: [],
    }
  );
}

export function exportCalendrierPDF(
  stages: { stage_action: string; categorie: string; date_debut: string; date_fin: string }[],
  mois: number,
  annee: number,
  reservations: ReservationEnrichedV2[] = []
) {
  const cursor = new Date(annee, mois - 1, 1);
  const label = format(cursor, "MMMM yyyy", { locale: fr });
  const monthStart = startOfMonth(cursor);
  const monthEnd = endOfMonth(monthStart);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const stagesByDay = new Map<string, typeof stages>();
  for (const s of stages) {
    const start = parseISO(s.date_debut.includes("T") ? s.date_debut : `${s.date_debut}T12:00:00`);
    const end = parseISO(s.date_fin.includes("T") ? s.date_fin : `${s.date_fin}T12:00:00`);
    if (Number.isNaN(start.getTime())) continue;
    const endD = Number.isNaN(end.getTime()) ? start : end;
    for (const d of eachDayOfInterval({ start, end: endD })) {
      const key = format(d, "yyyy-MM-dd");
      if (!stagesByDay.has(key)) stagesByDay.set(key, []);
      stagesByDay.get(key)!.push(s);
    }
  }

  const resaByDay = new Map<string, ReservationEnrichedV2[]>();
  for (const r of reservations) {
    const key = r.date_debut.slice(0, 10);
    if (!resaByDay.has(key)) resaByDay.set(key, []);
    resaByDay.get(key)!.push(r);
  }

  const monthStages = [...stages]
    .filter((s) => {
      const start = parseISO(s.date_debut.includes("T") ? s.date_debut : `${s.date_debut}T12:00:00`);
      const end = parseISO(s.date_fin.includes("T") ? s.date_fin : `${s.date_fin}T12:00:00`);
      if (Number.isNaN(start.getTime())) return false;
      const endD = Number.isNaN(end.getTime()) ? start : end;
      return start <= monthEnd && endD >= monthStart;
    })
    .sort((a, b) => a.date_debut.localeCompare(b.date_debut));

  const sections: PdfSectionDef[] = [];
  if (monthStages.length > 0) {
    sections.push({
      title: "Programme du mois",
      columns: [
        { header: "Période", key: "periode", width: 42, align: "left" },
        { header: "Stage / Action", key: "stage", width: 70, align: "left" },
        { header: "Cat.", key: "categorie", width: 18, align: "center" },
        { header: "Jours", key: "jours", width: 14, align: "center" },
      ],
      data: monthStages.map((s) => {
        const start = parseISO(s.date_debut.includes("T") ? s.date_debut : `${s.date_debut}T12:00:00`);
        const end = parseISO(s.date_fin.includes("T") ? s.date_fin : `${s.date_fin}T12:00:00`);
        const jours =
          Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())
            ? "—"
            : String(
                Math.max(
                  1,
                  Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
                )
              );
        return {
          periode: `${formatDateFR(s.date_debut)} → ${formatDateFR(s.date_fin)}`,
          stage: s.stage_action,
          categorie: s.categorie,
          jours,
        };
      }),
    });
  }

  if (reservations.length > 0) {
    sections.push({
      title: "Réservations infrastructures",
      columns: [
        { header: "Date", key: "date", width: 28, align: "center" },
        { header: "Créneau", key: "creneau", width: 28, align: "center" },
        { header: "Court", key: "court", width: 35, align: "left" },
        { header: "Stage", key: "stage", width: 45, align: "left" },
        { header: "Statut", key: "statut", width: 22, align: "center" },
      ],
      data: [...reservations]
        .filter((r) => {
          const d = parseISO(r.date_debut.slice(0, 10) + "T12:00:00");
          return !Number.isNaN(d.getTime()) && isSameMonth(d, monthStart);
        })
        .sort((a, b) => a.date_debut.localeCompare(b.date_debut))
        .map((r) => {
          const c = getCreneauInfo(r.date_debut, r.date_fin, r.creneau);
          return {
            date: formatDateFR(r.date_debut),
            creneau: formatCreneauPdf(c.type),
            court: safePdfCell(r.court_nom),
            stage: safePdfCell(r.stage_nom),
            statut: formatStatutPdf(r.statut ?? "prevu"),
          };
        }),
    });
  }

  return runFrmPdf({
    title: "Calendrier des stages",
    subtitle: label,
    orientation: "landscape",
    filename: buildPdfFilename("CALENDRIER", label, `${annee}-${String(mois).padStart(2, "0")}-01`),
    footerNote: `${monthStages.length} stage(s) · ${reservations.length} réservation(s) — ${label}`,
    columns: [],
    data: [],
    sections,
    customBody: (doc: jsPDF, pageW, pageH, startY) => {
      const cols = 7;
      const left = 12;
      const gridW = pageW - 24;
      const cellW = gridW / cols;
      const top = startY + 2;
      const rowCount = Math.ceil(days.length / 7);
      const legendReserve = 22;
      const maxGridH = Math.max(48, pageH - startY - legendReserve - 8);
      const cellH = Math.min(18, maxGridH / rowCount);
      const headers = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

      doc.setFillColor(...FRMT.tableHeaderBg);
      doc.rect(left, top, gridW, 8, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(...FRMT.tableHeaderText);
      headers.forEach((h, i) => {
        doc.text(h, left + i * cellW + cellW / 2, top + 5.5, { align: "center" });
      });

      let y = top + 8;
      days.forEach((day, idx) => {
        const col = idx % 7;
        if (col === 0 && idx > 0) y += cellH;
        const x = left + col * cellW;
        const inMonth = isSameMonth(day, monthStart);
        const key = format(day, "yyyy-MM-dd");

        doc.setFillColor(...(inMonth ? FRMT.white : FRMT.cream));
        doc.rect(x, y, cellW, cellH, "F");
        doc.setDrawColor(...FRMT.borderGray);
        doc.setLineWidth(0.2);
        doc.rect(x, y, cellW, cellH);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(inMonth ? 9 : 8);
        doc.setTextColor(...(inMonth ? FRMT.darkGray : FRMT.midGray));
        doc.text(format(day, "d"), x + 3, y + 5);

        if (inMonth) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(5.5);
          doc.setTextColor(...FRMT.midGray);
          doc.text(format(day, "EEE", { locale: fr }).slice(0, 3), x + cellW - 3, y + 5, {
            align: "right",
          });
        }

        const dayStages = stagesByDay.get(key) ?? [];
        dayStages.slice(0, 3).forEach((st, si) => {
          const cat = getCategoryStyle(st.categorie);
          const [r, g, b] = hexRgb(cat.border);
          const barY = y + 7 + si * 3.2;
          doc.setFillColor(r, g, b);
          doc.roundedRect(x + 1.5, barY, cellW - 3, 2.8, 0.5, 0.5, "F");
          doc.setFontSize(5);
          doc.setTextColor(...FRMT.white);
          doc.text(st.stage_action.slice(0, Math.floor((cellW - 4) / 1.6)), x + 2.5, barY + 2.2);
        });

        const dayResa = resaByDay.get(key) ?? [];
        dayResa.slice(0, 1).forEach((r, ri) => {
          const offset = Math.min(3, dayStages.length) + ri;
          const barY = y + 7 + offset * 3.2;
          doc.setFillColor(124, 58, 237);
          doc.roundedRect(x + 1.5, barY, cellW - 3, 2.8, 0.5, 0.5, "F");
          doc.setFontSize(5);
          doc.setTextColor(...FRMT.white);
          doc.text((r.court_nom ?? "Résa").slice(0, 10), x + 2.5, barY + 2.2);
        });
      });

      let ly = y + cellH + 6;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(...FRMT.green);
      doc.text("Légende", left, ly);
      ly += 5;

      doc.setFillColor(...FRMT.green);
      doc.roundedRect(left, ly, 4, 4, 1, 1, "F");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      doc.setTextColor(...FRMT.darkGray);
      doc.text("Stage (couleur = catégorie d'âge)", left + 7, ly + 3.5);
      const [vr, vg, vb] = hexRgb("#7c3aed");
      doc.setFillColor(vr, vg, vb);
      doc.roundedRect(left + 95, ly, 4, 4, 1, 1, "F");
      doc.text("Réservation infrastructure", left + 102, ly + 3.5);

      ly += 8;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(...FRMT.greenDark);
      doc.text("Catégories :", left, ly);
      const cats = ["U8", "U10", "U12", "U14", "U16", "U18", "Elite Pro"];
      cats.forEach((c, i) => {
        const cat = getCategoryStyle(c);
        const [r, g, b] = hexRgb(cat.border);
        const cx = left + i * 36;
        doc.setFillColor(r, g, b);
        doc.roundedRect(cx, ly + 1, 5, 5, 1, 1, "F");
        doc.setFont("helvetica", "normal");
        doc.setFontSize(6);
        doc.setTextColor(...FRMT.darkGray);
        doc.text(c, cx + 7, ly + 5);
      });

      return ly + 10;
    },
  });
}

export function exportPlanningPDF(
  seances: {
    date: string;
    jour?: string;
    creneau?: string;
    horaire?: string;
    heure_debut?: string;
    heure_fin?: string;
    stage?: string;
    categorie?: string;
    statut: string;
    nombre_joueurs?: number;
    nombre_coachs?: number;
    hebergement?: string;
    restauration?: string;
    terrains?: string;
    terrains_supplementaires?: string;
    lettre_envoyee?: string;
    licences_verifiees?: string;
  }[],
  options?: string | {
    weekLabel?: string;
    generatedBy?: string;
    summary?: {
      totalSeances: number;
      stagesActifs: number;
      totalJoueurs: number;
      totalCoachs: number;
      creneauxMatin: number;
      creneauxApresMidi: number;
    };
  }
) {
  const data = [...seances]
    .sort((a, b) => `${a.date}${a.horaire ?? a.heure_debut ?? ""}`.localeCompare(`${b.date}${b.horaire ?? b.heure_debut ?? ""}`))
    .map((r) => ({
      date: formatDateFR(r.date),
      jour: safePdfCell(r.jour ?? ""),
      creneau: safePdfCell(r.creneau ?? ""),
      horaire: safePdfCell(r.horaire ?? `${r.heure_debut ?? "—"} – ${r.heure_fin ?? "—"}`),
      stage: safePdfCell(r.stage ?? "—"),
      categorie: safePdfCell(r.categorie ?? "—"),
      statut: formatStatutPdf(r.statut ?? "prevu"),
      joueurs: String(r.nombre_joueurs ?? 0),
      coachs: String(r.nombre_coachs ?? 0),
      hebergement: safePdfCell(r.hebergement ?? "Non"),
      restauration: safePdfCell(r.restauration ?? "Non"),
      terrains: safePdfCell(r.terrains ?? "Non"),
      terrainsSupp: safePdfCell(r.terrains_supplementaires ?? "Non"),
      lettreEnvoyee: safePdfCell(r.lettre_envoyee ?? "Non"),
      licencesVerifiees: safePdfCell(r.licences_verifiees ?? "Non"),
    }));

  const dates = seances.map((s) => s.date).filter(Boolean).sort();
  const periode =
    dates.length >= 2
      ? `Du ${formatDateFR(dates[0]!)} au ${formatDateFR(dates[dates.length - 1]!)}`
      : dates[0]
        ? formatDateFR(dates[0]!)
        : undefined;

  const optsObj = typeof options === "string" ? { weekLabel: options } : options;
  const generatedBy = optsObj?.generatedBy ?? "Utilisateur FRMT";
  const periodeWithMeta = `${optsObj?.weekLabel ?? periode ?? "Période non définie"} • Date export: ${formatDateFR(new Date().toISOString())} • Généré: ${generatedBy}`;
  const summary = optsObj?.summary;

  return runFrmPdf({
    title: "Planning hebdomadaire des séances",
    subtitle: "Fédération Royale Marocaine de Tennis • Centre National",
    periode: periodeWithMeta,
    orientation: "landscape",
    filename: `Planning_Hebdomadaire_${new Date().toISOString().slice(0, 10)}.pdf`.replace(/\s+/g, "_"),
    columns: [
      { header: "Date", key: "date", width: 16, align: "center" },
      { header: "Jour", key: "jour", width: 14, align: "center" },
      { header: "Créneau", key: "creneau", width: 18, align: "center" },
      { header: "Horaire", key: "horaire", width: 14, align: "center" },
      { header: "Stage", key: "stage", width: 24, align: "left" },
      { header: "Catégorie", key: "categorie", width: 12, align: "center" },
      { header: "Statut", key: "statut", width: 12, align: "center" },
      { header: "Nb joueurs", key: "joueurs", width: 10, align: "center" },
      { header: "Nb coachs", key: "coachs", width: 10, align: "center" },
      { header: "Héb.", key: "hebergement", width: 8, align: "center" },
      { header: "Rest.", key: "restauration", width: 8, align: "center" },
      { header: "Terr.", key: "terrains", width: 8, align: "center" },
      { header: "Terr. supp.", key: "terrainsSupp", width: 12, align: "center" },
      { header: "Lettre", key: "lettreEnvoyee", width: 9, align: "center" },
      { header: "Licences", key: "licencesVerifiees", width: 10, align: "center" },
    ],
    data,
    sections:
      summary ?
        [
          {
            title: "Résumé hebdomadaire",
            columns: [
              { header: "Indicateur", key: "label", width: 55, align: "left" },
              { header: "Valeur", key: "value", width: 45, align: "right" },
            ],
            data: [
              { label: "Nombre total de séances", value: String(summary.totalSeances), _isTotal: true },
              { label: "Nombre de stages actifs", value: String(summary.stagesActifs), _isTotal: true },
              { label: "Total joueurs", value: String(summary.totalJoueurs), _isTotal: true },
              { label: "Total coachs", value: String(summary.totalCoachs), _isTotal: true },
              { label: "Créneaux matin", value: String(summary.creneauxMatin), _isTotal: false },
              { label: "Créneaux après-midi", value: String(summary.creneauxApresMidi), _isTotal: false },
            ],
          },
        ]
      : [],
    footerNote: "Document généré automatiquement par FRMT Centre National V2",
    generatedBy,
    appVersion: "FRMT V2",
  });
}

export function exportHebergementPDF(rows: Record<string, string>[], stageName?: string) {
  const keys = Object.keys(rows[0] ?? { stage: "" });
  return runFrmPdf({
    title: "Fiche Hébergement",
    subtitle: stageName,
    filename: `Hebergement_${stageName ?? "Centre_National"}.pdf`.replace(/\s+/g, "_"),
    columns: keys.map((k) => ({ header: k, key: k })),
    data: rows,
    generatedBy: "Utilisateur FRMT",
    appVersion: "FRMT V2",
  });
}

export function exportRestaurationPDF(
  rows: Record<string, string>[],
  totals?: Record<string, string>,
  stageName?: string
) {
  const keys = Object.keys(rows[0] ?? { date: "" });
  const sections: PdfSectionDef[] = [];
  if (totals) {
    sections.push({
      title: "Totaux",
      columns: Object.keys(totals).map((k) => ({ header: k, key: k })),
      data: [totals],
    });
  }
  return runFrmPdf({
    title: "Fiche restauration",
    subtitle: stageName,
    filename: "restauration.pdf",
    columns: keys.map((k) => ({ header: k, key: k })),
    data: rows,
    sections,
    generatedBy: "Utilisateur FRMT",
    appVersion: "FRMT V2",
  });
}

export function exportPasseportsPDF(rows: Record<string, string>[]) {
  const keys = Object.keys(rows[0] ?? { nom: "" });
  return runFrmPdf({
    title: "Liste des documents officiels",
    subtitle: "Pour soumission aux autorités compétentes",
    filename: "passeports.pdf",
    columns: keys.map((k) => ({ header: k, key: k })),
    data: rows,
  });
}

export function exportLogistiquePDF(rows: Record<string, string>[]) {
  const keys = Object.keys(rows[0] ?? { stage: "" });
  return runFrmPdf({
    title: "Demandes logistiques",
    filename: "logistique.pdf",
    columns: keys.map((k) => ({ header: k, key: k })),
    data: rows,
  });
}

export function exportStagesLogistiquePDF(params: {
  periodeLabel: string;
  rows: {
    stage: string;
    categorie: string;
    dates: string;
    duree: string;
    joueurs: string;
    coachs: string;
    chambres: string;
    hebergement: string;
    terrains: string;
  }[];
  totals: { joueurs: number; coachs: number; chambres: number };
}) {
  return runFrmPdf({
    title: "Planification Logistique des Stages",
    subtitle: "CENTRE NATIONAL FRMT",
    periode: `${params.periodeLabel} • Export le ${formatDateFR(new Date().toISOString())}`,
    orientation: "landscape",
    filename: buildPdfFilename("LOGISTIQUE-STAGES", "planification", new Date().toISOString().slice(0, 10)),
    columns: [
      { header: "Stage", key: "stage", width: 40, align: "left" },
      { header: "Cat.", key: "categorie", width: 16, align: "center" },
      { header: "Dates", key: "dates", width: 38, align: "left" },
      { header: "Durée", key: "duree", width: 12, align: "center" },
      { header: "Joueurs", key: "joueurs", width: 15, align: "center" },
      { header: "Coachs", key: "coachs", width: 15, align: "center" },
      { header: "Chambres", key: "chambres", width: 16, align: "center" },
      { header: "Héb.", key: "hebergement", width: 14, align: "center" },
      { header: "Terr.", key: "terrains", width: 14, align: "center" },
    ],
    data: params.rows.length ? params.rows : [{
      stage: "—",
      categorie: "—",
      dates: "—",
      duree: "—",
      joueurs: "0",
      coachs: "0",
      chambres: "0",
      hebergement: "Non",
      terrains: "Non",
    }],
    sections: [
      {
        title: "Total général",
        columns: [
          { header: "Indicateur", key: "label", width: 65, align: "left" },
          { header: "Valeur", key: "value", width: 35, align: "right" },
        ],
        data: [
          { label: "Total joueurs", value: String(params.totals.joueurs), _isTotal: true },
          { label: "Total coachs", value: String(params.totals.coachs), _isTotal: true },
          { label: "Total chambres", value: String(params.totals.chambres), _isTotal: true },
        ],
      },
    ],
  });
}

export function exportRapportMensuelPDF(
  mois: number,
  annee: number,
  data: {
    stages: Record<string, string>[];
    participants: Record<string, string>[];
    occupation: Record<string, string>[];
    financier?: Record<string, string>[];
  }
) {
  const label = format(new Date(annee, mois - 1, 1), "MMMM yyyy", { locale: fr });
  const sections: PdfSectionDef[] = [
    {
      title: "Synthèse stages",
      columns: cols(data.stages),
      data: data.stages,
    },
    {
      title: "Synthèse participants",
      columns: cols(data.participants),
      data: data.participants,
    },
    {
      title: "Occupation installations",
      columns: cols(data.occupation),
      data: data.occupation,
    },
  ];
  if (data.financier?.length) {
    sections.push({
      title: "Synthèse financière",
      columns: cols(data.financier),
      data: data.financier,
    });
  }
  return runFrmPdf({
    title: "Rapport mensuel d'activité",
    subtitle: `Mois de ${label}`,
    filename: `rapport-mensuel-${annee}-${mois}.pdf`,
    columns: [],
    data: [],
    sections,
  });
}

function cols(rows: Record<string, string>[]) {
  return Object.keys(rows[0] ?? { info: "" }).map((k) => ({ header: k, key: k }));
}

export function exportListePdf(
  title: string,
  headers: string[],
  rows: (string | number)[][],
  filename: string,
  showSignataires = false
): Promise<void> {
  const keys = headers.map((_, i) => `c${i}`);
  return runFrmPdf({
    title,
    columns: headers.map((h, i) => ({ header: h, key: keys[i]!, align: i === 0 ? "left" : "center" })),
    data: rows.map((r) =>
      Object.fromEntries(keys.map((k, i) => [k, String(r[i] ?? "—")]))
    ),
    showSignataires,
    filename,
  });
}

export { FRMT, generateFRMTPDF };
