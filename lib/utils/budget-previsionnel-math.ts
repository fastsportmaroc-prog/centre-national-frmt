import {
  getBudgetLigneSaisieMode,
  type BudgetLigneSaisieMode,
} from "@/lib/constants/budget-ligne-saisie";
import type { BudgetPrevisionnelLine } from "@/lib/types/budget-previsionnel";

export function ligneTotalEur(
  line: {
    designation?: string;
    quantite: number;
    jours_nuits: number;
    prix_unitaire_eur: number;
  },
  opts?: { simpleQtyPrice?: boolean; mode?: BudgetLigneSaisieMode }
): number {
  const q = Math.max(0, line.quantite || 0);
  const p = Math.max(0, line.prix_unitaire_eur || 0);
  const j = Math.max(1, line.jours_nuits || 1);

  const mode =
    opts?.mode ??
    (line.designation ? getBudgetLigneSaisieMode(line.designation) : undefined) ??
    (opts?.simpleQtyPrice ? "quantite_prix" : "personnes_nuits_prix");

  let total: number;
  switch (mode) {
    case "personnes_nuits_prix":
    case "personnes_jours_prix":
      total = q * j * p;
      break;
    case "personnes_prix":
      total = q * p;
      break;
    case "quantite_prix":
    default:
      total = opts?.simpleQtyPrice || j <= 1 ? q * p : q * j * p;
      break;
  }
  return Math.round(total * 100) / 100;
}

export function computeLignesWithTotals(
  lignes: Array<Omit<BudgetPrevisionnelLine, "id" | "total_eur"> & { id?: string }>,
  opts?: { simpleQtyPrice?: boolean }
): BudgetPrevisionnelLine[] {
  return lignes.map((l, i) => ({
    ...l,
    id: l.id ?? `line-${i}`,
    total_eur: ligneTotalEur(l, {
      ...opts,
      mode: l.designation ? getBudgetLigneSaisieMode(l.designation) : undefined,
    }),
    ordre: l.ordre ?? i,
  }));
}
export function computeBudgetTotals(
  lignes: BudgetPrevisionnelLine[],
  tauxMad: number,
  devise: "EUR" | "MAD" = "EUR"
) {
  const sous_total =
    Math.round(lignes.reduce((s, l) => s + (l.total_eur || 0), 0) * 100) / 100;

  if (devise === "MAD") {
    const total_mad = sous_total;
    return {
      sous_total_eur: 0,
      total_eur: 0,
      total_mad,
      montant_lettres_mad: montantEnLettresMad(total_mad),
    };
  }

  const total_eur = sous_total;
  const total_mad = Math.round(total_eur * tauxMad * 100) / 100;
  const montant_lettres_mad = montantEnLettresMad(total_mad);
  return { sous_total_eur: sous_total, total_eur, total_mad, montant_lettres_mad };
}

const UNITS = [
  "",
  "un",
  "deux",
  "trois",
  "quatre",
  "cinq",
  "six",
  "sept",
  "huit",
  "neuf",
  "dix",
  "onze",
  "douze",
  "treize",
  "quatorze",
  "quinze",
  "seize",
  "dix-sept",
  "dix-huit",
  "dix-neuf",
];
const TENS = [
  "",
  "",
  "vingt",
  "trente",
  "quarante",
  "cinquante",
  "soixante",
  "soixante",
  "quatre-vingt",
  "quatre-vingt",
];

function under100(n: number): string {
  if (n < 20) return UNITS[n] ?? String(n);
  if (n < 70) {
    const t = Math.floor(n / 10);
    const u = n % 10;
    if (t === 7 && u === 1) return "soixante et onze";
    if (t === 7) return `soixante-${UNITS[10 + u]}`;
    if (u === 1 && t > 1) return `${TENS[t]}-et-un`;
    return u ? `${TENS[t]}-${UNITS[u]}` : TENS[t];
  }
  if (n < 80) return n === 71 ? "soixante et onze" : `soixante-${under100(n - 60)}`;
  if (n < 100) {
    const u = n % 20;
    return u ? `quatre-vingt-${under100(u)}` : "quatre-vingts";
  }
  return String(n);
}

function under1000(n: number): string {
  if (n < 100) return under100(n);
  const h = Math.floor(n / 100);
  const r = n % 100;
  const cent = h > 1 ? `${under100(h)} cent` : "cent";
  return r ? `${cent} ${under100(r)}` : cent;
}

function underMillion(n: number): string {
  if (n < 1000) return under1000(n);
  const k = Math.floor(n / 1000);
  const r = n % 1000;
  const mille = k > 1 ? `${under1000(k)} mille` : "mille";
  return r ? `${mille} ${under1000(r)}` : mille;
}

/** Montant en lettres (dirhams, partie entière). */
export function montantEnLettresMad(amount: number): string {
  const entier = Math.floor(Math.abs(amount));
  const centimes = Math.round((Math.abs(amount) - entier) * 100);
  let text = underMillion(entier);
  if (!text) text = "zéro";
  text = text.charAt(0).toUpperCase() + text.slice(1);
  if (centimes > 0) {
    return `${text} dirhams et ${under100(centimes)} centimes`;
  }
  return `${text} dirhams`;
}

export function formatEur(n: number): string {
  return `${n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
}

export function formatMad(n: number): string {
  return `${n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MAD`;
}
