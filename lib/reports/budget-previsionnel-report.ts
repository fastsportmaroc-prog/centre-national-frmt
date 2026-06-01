import {
  buildPrintFooterHtml,
  buildPrintHeaderHtml,
} from "@/lib/print/print-layout-html";
import { getPrintReportCss, PRINT_COLORS } from "@/lib/print/print-report-css";
import { formatPeriodePrint } from "@/lib/print/format-date";
import { budgetMembreExtraBadgeLabel } from "@/lib/constants/budget-membres";
import {
  SIGNATAIRES_PDF_OFFICIELS,
  TYPES_BUDGET,
} from "@/lib/constants/budget-previsionnel";
import type { BudgetPrevisionnel } from "@/lib/types/budget-previsionnel";
import {
  computeBudgetTotals,
  formatEur,
  formatMad,
} from "@/lib/utils/budget-previsionnel-math";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function typeLabel(t: string) {
  return TYPES_BUDGET.find((x) => x.value === t)?.label ?? t;
}

function formatNum(n: number, decimals = 2): string {
  return n.toLocaleString("fr-FR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function isStaffToken(token: string): boolean {
  const t = token.trim();
  return (
    t.startsWith("Kinésithérapeute") ||
    t.startsWith("Kinesithérapeute") ||
    t.startsWith("Membre fédéral") ||
    t.startsWith("Membre federal") ||
    t === "Autre" ||
    t.startsWith("Autre ·")
  );
}

/** Découpe sujet_libelle en joueurs / staff (ordre formulaire : joueurs, coachs, extras). */
function parseBudgetRosterPdf(budget: BudgetPrevisionnel): {
  mission: string;
  equipe: string | null;
  joueurs: string[];
  staff: string[];
} {
  const mission =
    [budget.tournoi_evenement?.trim(), typeLabel(budget.type_budget)]
      .filter(Boolean)
      .join(" · ") || budget.objet.trim();

  const equipe = budget.equipe_libelle?.trim() || null;
  const sujet = budget.sujet_libelle?.trim() || "";
  let namesPart = sujet;

  if (equipe && sujet.startsWith(`${equipe} —`)) {
    namesPart = sujet.slice(equipe.length + 3).trim();
  } else if (!equipe && sujet.includes(" — ")) {
    namesPart = sujet.slice(sujet.indexOf(" — ") + 3).trim();
  }

  const tokens = namesPart
    ? namesPart
        .split(/,\s*/)
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  const p = budget.participants;
  const jCount = p?.joueur_ids?.length ?? (budget.joueur_id ? 1 : 0);
  const cCount =
    p?.coach_ids?.length ??
    (budget.coach_nom ? budget.coach_nom.split(/,\s*/).filter(Boolean).length : 0);

  let joueurs: string[] = [];
  let staff: string[] = [];

  if (jCount > 0 && tokens.length >= jCount) {
    joueurs = tokens.slice(0, jCount);
    const rest = tokens.slice(jCount);
    staff = [...rest.slice(0, cCount), ...rest.slice(cCount)];
  } else if (tokens.length) {
    for (const t of tokens) {
      if (isStaffToken(t)) staff.push(t);
      else joueurs.push(t);
    }
  }

  if (budget.coach_nom?.trim() && !staff.length && cCount === 0) {
    staff.push(
      ...budget.coach_nom
        .split(/,\s*/)
        .map((s) => s.trim())
        .filter(Boolean)
    );
  }

  for (const m of p?.membres_extras ?? []) {
    const label = budgetMembreExtraBadgeLabel(m);
    if (!staff.includes(label)) staff.push(label);
  }

  return { mission, equipe, joueurs, staff };
}

function rosterListHtml(names: string[]): string {
  if (!names.length) return `<li class="budget-roster-empty">—</li>`;
  return names.map((n) => `<li>${escapeHtml(n)}</li>`).join("");
}

function buildCompactContextHtml(budget: BudgetPrevisionnel): string {
  const periode = formatPeriodePrint(budget.date_debut, budget.date_fin);
  const lieu = [budget.ville, budget.pays].filter(Boolean).join(", ") || "—";
  const { mission, equipe, joueurs, staff } = parseBudgetRosterPdf(budget);

  const equipeLine = equipe
    ? `<p class="budget-context-equipe"><span class="budget-context-equipe-label">Équipe</span> ${escapeHtml(equipe)}</p>`
    : "";

  const rosterBlock =
    joueurs.length || staff.length
      ? `
    <div class="budget-roster no-break">
      <div class="budget-roster-col">
        <span class="budget-roster-label">Joueurs${joueurs.length ? ` (${joueurs.length})` : ""}</span>
        <ul class="budget-roster-list">${rosterListHtml(joueurs)}</ul>
      </div>
      <div class="budget-roster-col">
        <span class="budget-roster-label">Staff${staff.length ? ` (${staff.length})` : ""}</span>
        <ul class="budget-roster-list">${rosterListHtml(staff)}</ul>
      </div>
    </div>`
      : "";

  return `
  <div class="budget-context no-break">
    <h1 class="budget-doc-title">Budget prévisionnel</h1>
    <p class="budget-context-mission">${escapeHtml(mission)}</p>
    ${equipeLine}
    ${rosterBlock}
    <table class="budget-context-table">
      <tbody>
        <tr>
          <th>Période</th>
          <td>${escapeHtml(periode)}</td>
          <th>Lieu</th>
          <td>${escapeHtml(lieu)}</td>
        </tr>
        <tr>
          <th>Référence</th>
          <td colspan="3">${escapeHtml(budget.objet)}</td>
        </tr>
      </tbody>
    </table>
  </div>`;
}

function budgetDevise(budget: BudgetPrevisionnel): "EUR" | "MAD" {
  return budget.devise === "MAD" ? "MAD" : "EUR";
}

function resolveBudgetTotals(budget: BudgetPrevisionnel) {
  const devise = budgetDevise(budget);
  const computed = computeBudgetTotals(budget.lignes, budget.taux_mad, devise);
  return {
    devise,
    sous_total_eur: budget.sous_total_eur || computed.sous_total_eur,
    total_eur: budget.total_eur || computed.total_eur,
    total_mad: budget.total_mad || computed.total_mad,
    montant_lettres_mad: budget.montant_lettres_mad || computed.montant_lettres_mad,
  };
}

function formatBudgetAmount(n: number, devise: "EUR" | "MAD"): string {
  return devise === "MAD" ? formatMad(n) : formatEur(n);
}

function buildBudgetLinesTableHtml(budget: BudgetPrevisionnel, devise: "EUR" | "MAD"): string {
  const puLabel = devise === "MAD" ? "P.U. MAD" : "P.U. EUR";
  const totalLabel = devise === "MAD" ? "Total MAD" : "Total EUR";

  const lineRows = budget.lignes
    .sort((a, b) => a.ordre - b.ordre)
    .map(
      (l) => `
    <tr>
      <td class="tl">${escapeHtml(l.designation)}</td>
      <td class="tl desc">${escapeHtml(l.description?.trim() || "—")}</td>
      <td class="tc">${l.quantite}</td>
      <td class="tc">${l.jours_nuits}</td>
      <td class="tr">${formatBudgetAmount(l.prix_unitaire_eur, devise)}</td>
      <td class="tr bold">${formatBudgetAmount(l.total_eur, devise)}</td>
    </tr>`
    )
    .join("");

  return `
  <table class="rt rt-legacy budget-lines">
    <thead>
      <tr>
        <th class="tl">Désignation</th>
        <th class="tl">Description</th>
        <th>Qté</th>
        <th>J./Nuits</th>
        <th class="tr">${puLabel}</th>
        <th class="tr">${totalLabel}</th>
      </tr>
    </thead>
    <tbody>
      ${lineRows || '<tr><td colspan="6" class="tc">Aucune ligne</td></tr>'}
    </tbody>
  </table>`;
}

function buildBudgetTotalsHtml(
  budget: BudgetPrevisionnel,
  totals: ReturnType<typeof resolveBudgetTotals>
): string {
  if (totals.devise === "MAD") {
    return `
  <div class="budget-totals-wrap">
    <div class="budget-totals">
      <div class="row grand"><span>Total MAD</span><strong>${formatMad(totals.total_mad)}</strong></div>
    </div>
  </div>`;
  }

  return `
  <div class="budget-totals-wrap">
    <div class="budget-totals">
      <div class="row"><span>Sous-total EUR</span><strong>${formatEur(totals.sous_total_eur)}</strong></div>
      <div class="row grand"><span>Total EUR</span><strong>${formatEur(totals.total_eur)}</strong></div>
      <div class="row"><span>Taux EUR → MAD</span><strong>${formatNum(budget.taux_mad)}</strong></div>
      <div class="row grand"><span>Total MAD</span><strong>${formatMad(totals.total_mad)}</strong></div>
    </div>
  </div>`;
}

/** HTML A4 portrait — budget prévisionnel officiel */
export function buildBudgetPrevisionnelReportHtml(budget: BudgetPrevisionnel): string {
  const c = PRINT_COLORS;
  const totals = resolveBudgetTotals(budget);
  const devise = totals.devise;

  const sigBlocks = [...SIGNATAIRES_PDF_OFFICIELS]
    .sort((a, b) => a.ordre - b.ordre)
    .map(
      (s) => `
    <div class="sig-block">
      <p class="sig-poste">${escapeHtml(s.poste)}</p>
      <p class="sig-nom">${escapeHtml(s.nom)}</p>
      <div class="sig-zone" aria-hidden="true"></div>
    </div>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8"/>
  <title>Budget prévisionnel — ${escapeHtml(budget.tournoi_evenement || budget.objet)}</title>
  <style>
    ${getPrintReportCss({ legacy: true })}
    body { margin: 0; padding: 0; }
    .budget-doc-title {
      font-size: 12pt;
      font-weight: 700;
      color: ${c.green};
      margin: 0 0 4px;
      text-transform: uppercase;
      letter-spacing: 0.4pt;
      border-bottom: 2px solid ${c.green};
      padding-bottom: 4px;
    }
    .budget-context {
      margin-bottom: 10px;
    }
    .budget-context-mission {
      font-size: 9pt;
      font-weight: 700;
      color: ${c.text};
      margin: 6px 0 4px;
      line-height: 1.3;
    }
    .budget-context-equipe {
      font-size: 7.5pt;
      color: ${c.muted};
      margin: 0 0 6px;
    }
    .budget-context-equipe-label {
      font-weight: 700;
      color: ${c.green};
      text-transform: uppercase;
      font-size: 6.5pt;
      letter-spacing: 0.04em;
      margin-right: 4px;
    }
    .budget-roster {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px 14px;
      margin: 0 0 8px;
      padding: 6px 8px;
      background: #f6faf6;
      border: 1px solid ${c.border};
    }
    .budget-roster-label {
      display: block;
      font-size: 6.5pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: ${c.green};
      margin-bottom: 3px;
      border-bottom: 1px solid ${c.border};
      padding-bottom: 2px;
    }
    .budget-roster-list {
      margin: 0;
      padding: 0;
      list-style: none;
      font-size: 7pt;
      line-height: 1.35;
      color: #333;
    }
    .budget-roster-list li {
      padding: 1px 0;
    }
    .budget-roster-empty { color: #999; font-style: italic; }
    .budget-context-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 7.5pt;
      color: ${c.muted};
    }
    .budget-context-table th {
      font-weight: 600;
      color: ${c.green};
      text-align: left;
      padding: 2px 8px 2px 0;
      white-space: nowrap;
      vertical-align: top;
      width: 1%;
    }
    .budget-context-table td {
      padding: 2px 12px 2px 0;
      vertical-align: top;
      color: #333;
    }
    table.budget-lines.rt {
      margin-top: 2px;
      margin-bottom: 8px;
      font-size: 9pt;
    }
    table.budget-lines.rt thead th { padding: 7px 6px; font-size: 7.5pt; }
    table.budget-lines.rt tbody td { padding: 6px 6px; vertical-align: top; }
    table.budget-lines.rt td.desc { color: #444; max-width: 32%; }
    .budget-totals-wrap {
      display: flex;
      justify-content: flex-end;
      margin: 2px 0 8px;
      page-break-inside: avoid;
    }
    .budget-totals {
      width: min(100%, 300px);
      font-size: 9pt;
      border-top: 2px solid ${c.green};
      padding-top: 6px;
    }
    .budget-totals .row {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      margin: 2px 0;
      color: #333;
    }
    .budget-totals .row.grand {
      font-weight: 800;
      font-size: 10pt;
      color: ${c.green};
      margin-top: 4px;
      padding-top: 4px;
      border-top: 1px solid ${c.border};
    }
    .lettres {
      margin: 0 0 10px;
      font-style: italic;
      font-size: 8.5pt;
      color: #444;
      padding-left: 8px;
      border-left: 2px solid ${c.red};
      page-break-inside: avoid;
    }
    .signatures.budget-sigs {
      display: flex;
      flex-wrap: nowrap;
      justify-content: space-between;
      gap: 24px;
      margin: 52px 0 12px;
      padding-top: 16px;
      page-break-inside: avoid;
    }
    .sig-block { flex: 1; max-width: 48%; text-align: center; }
    .sig-poste {
      font-size: 7.5pt;
      font-weight: 700;
      color: ${c.green};
      margin: 0 0 4px;
      line-height: 1.3;
      min-height: 20px;
    }
    .sig-nom {
      font-size: 10pt;
      font-weight: 700;
      margin: 0;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
    .sig-zone {
      border-top: 1px solid #333;
      padding-top: 4px;
      font-size: 7.5pt;
      color: #666;
      margin-top: 22px;
      max-width: 180px;
      margin-left: auto;
      margin-right: auto;
    }
    .print-footer { margin-top: 8px; }
    @media print {
      .signatures.budget-sigs { margin-top: 48px; padding-top: 20px; }
      .sig-zone { margin-top: 18px; }
    }
  </style>
</head>
<body>
  <div class="print-doc">
  ${buildPrintHeaderHtml({ reference: `CNF-${new Date().getFullYear()}` })}
  <div class="gold-line"></div>
  ${buildCompactContextHtml(budget)}

  ${buildBudgetLinesTableHtml(budget, devise)}

  ${buildBudgetTotalsHtml(budget, totals)}

  ${
    totals.montant_lettres_mad
      ? `<p class="lettres"><strong>Arrêté à :</strong> ${escapeHtml(totals.montant_lettres_mad)}</p>`
      : ""
  }

  <div class="signatures budget-sigs">${sigBlocks}</div>
  </div>

  ${buildPrintFooterHtml()}
  <script>window.onload=function(){window.print()}</script>
</body>
</html>`;
}

export async function openBudgetPrevisionnelPdf(budget: BudgetPrevisionnel): Promise<void> {
  const html = buildBudgetPrevisionnelReportHtml(budget);
  const w = window.open("", "_blank");
  if (!w) {
    alert("Autorisez les pop-ups pour exporter le PDF.");
    return;
  }
  w.document.write(html);
  w.document.close();
}
