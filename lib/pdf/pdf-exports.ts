"use client";

/**
 * Exports PDF GROUP B — moteur FRMTPdfEngine (lib/pdf/generators/*).
 * GROUP A non modifié : budget (ci-dessous) + lettres (lib/letters/letter-pdf.ts).
 */
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
import { generateFicheStagePDF, type FicheStagePdfInput } from "@/lib/pdf/generators/ficheStagePDF";
import { generateFicheJoueurPDF } from "@/lib/pdf/generators/ficheJoueurPDF";
import { generateFicheEntraineurPDF } from "@/lib/pdf/generators/ficheEntraineurPDF";
import { generateReservationsPDF } from "@/lib/pdf/generators/reservationsPDF";
import { generateBilletsPDF } from "@/lib/pdf/generators/billetsPDF";
import { generatePlanningPDF } from "@/lib/pdf/generators/planningPDF";
import { generateRapportHebergementPDF } from "@/lib/pdf/generators/rapportHebergementPDF";
import { generateRapportRestaurationPDF } from "@/lib/pdf/generators/rapportRestaurationPDF";
import { generatePasseportsPDF } from "@/lib/pdf/generators/passeportsPDF";
import {
  generateLogistiquePDF,
  generateStagesLogistiquePDF,
} from "@/lib/pdf/generators/rapportLogistiquePDF";
import { generateRapportMensuelPDF } from "@/lib/pdf/generators/rapportMensuelPDF";
import { generateListePDF } from "@/lib/pdf/generators/listePDF";

function hexRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

/** Legacy — budget + calendrier grille uniquement */
async function runFrmPdf(config: PDFConfig): Promise<void> {
  await generateFRMTPDF(config);
}

export function exportStagePDF(stage: FicheStagePdfInput) {
  return generateFicheStagePDF(stage);
}

export function exportJoueursPDF(joueurs: Record<string, string>[], filtres?: string) {
  return generateFicheJoueurPDF(joueurs, filtres);
}

export function exportEntraineursPDF(entraineurs: Record<string, string>[]) {
  return generateFicheEntraineurPDF(entraineurs);
}

export function exportReservationsPDF(
  reservations: ReservationEnrichedV2[],
  subtitle?: string
) {
  return generateReservationsPDF(reservations, subtitle);
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
  return exportBilletsPDF(data, totalMad, stageName);
}

export function exportBilletsPDF(
  rows: Record<string, string>[],
  totalMad: number,
  stageName?: string
) {
  return generateBilletsPDF(rows, totalMad, stageName);
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
  seances: Parameters<typeof generatePlanningPDF>[0],
  options?: Parameters<typeof generatePlanningPDF>[1]
) {
  return generatePlanningPDF(seances, options);
}

export function exportHebergementPDF(rows: Record<string, string>[], stageName?: string) {
  return generateRapportHebergementPDF(rows, stageName);
}

export function exportRestaurationPDF(
  rows: Record<string, string>[],
  totals?: Record<string, string>,
  stageName?: string
) {
  return generateRapportRestaurationPDF(rows, totals, stageName);
}

export function exportPasseportsPDF(rows: Record<string, string>[]) {
  return generatePasseportsPDF(rows);
}

export function exportLogistiquePDF(rows: Record<string, string>[]) {
  return generateLogistiquePDF(rows);
}

export function exportStagesLogistiquePDF(
  params: Parameters<typeof generateStagesLogistiquePDF>[0]
) {
  return generateStagesLogistiquePDF(params);
}

export function exportRapportMensuelPDF(
  mois: number,
  annee: number,
  data: Parameters<typeof generateRapportMensuelPDF>[2]
) {
  return generateRapportMensuelPDF(mois, annee, data);
}

export function exportListePdf(
  title: string,
  headers: string[],
  rows: (string | number)[][],
  filename: string,
  _showSignataires = false
): Promise<void> {
  return generateListePDF({ title, headers, rows, filename });
}

export { FRMT, generateFRMTPDF };
