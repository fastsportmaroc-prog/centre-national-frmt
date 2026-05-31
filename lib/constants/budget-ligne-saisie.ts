/** Modes de calcul des lignes budget voyage tennis */

export type BudgetLigneSaisieMode =
  | "personnes_nuits_prix"
  | "personnes_jours_prix"
  | "personnes_prix"
  | "quantite_prix";

export type BudgetLigneSaisieLabels = {
  col1: string;
  col2: string;
  prix: string;
  hint: string;
};

const MODE_LABELS: Record<BudgetLigneSaisieMode, BudgetLigneSaisieLabels> = {
  personnes_nuits_prix: {
    col1: "Personnes",
    col2: "Nuitées",
    prix: "Prix / nuitée",
    hint: "Total = personnes × nuitées × prix par nuitée",
  },
  personnes_jours_prix: {
    col1: "Personnes",
    col2: "Jours",
    prix: "Prix / jour",
    hint: "Total = personnes × jours × prix par jour",
  },
  personnes_prix: {
    col1: "Personnes",
    col2: "—",
    prix: "Prix unitaire",
    hint: "Total = personnes × prix unitaire",
  },
  quantite_prix: {
    col1: "Quantité",
    col2: "—",
    prix: "Prix unitaire",
    hint: "Total = quantité × prix unitaire",
  },
};

export function getBudgetLigneSaisieMode(designation: string): BudgetLigneSaisieMode {
  const d = designation
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (d.includes("hebergement")) return "personnes_nuits_prix";
  if (d.includes("restauration")) return "personnes_jours_prix";
  if (d.includes("argent de poche")) return "personnes_jours_prix";
  if (d.includes("kine") || d.includes("medical")) return "personnes_jours_prix";
  if (d.includes("billet") || d.includes("avion")) return "personnes_prix";
  if (d.includes("inscription")) return "personnes_prix";
  if (d.includes("visa")) return "personnes_prix";
  if (d.includes("transfert") && (d.includes("aller") || d.includes("retour"))) {
    return "personnes_prix";
  }
  if (d.includes("transport terrestre") || d.includes("transport local")) {
    return "quantite_prix";
  }

  return "quantite_prix";
}

export function getBudgetLigneSaisieLabels(mode: BudgetLigneSaisieMode): BudgetLigneSaisieLabels {
  return MODE_LABELS[mode];
}

export function countBudgetNights(dateDebut: string, dateFin: string): number {
  if (!dateDebut || !dateFin) return 1;
  const d0 = new Date(`${dateDebut}T12:00:00`);
  const d1 = new Date(`${dateFin}T12:00:00`);
  if (Number.isNaN(d0.getTime()) || Number.isNaN(d1.getTime())) return 1;
  const nights = Math.round((d1.getTime() - d0.getTime()) / 86_400_000);
  return Math.max(1, nights);
}

export function defaultBudgetLigneValues(
  designation: string,
  ctx: { nombrePersonnes?: number; dateDebut?: string; dateFin?: string }
): { quantite: number; jours_nuits: number; prix_unitaire_eur: number } {
  const mode = getBudgetLigneSaisieMode(designation);
  const personnes = Math.max(1, ctx.nombrePersonnes ?? 1);
  const nuits = countBudgetNights(ctx.dateDebut ?? "", ctx.dateFin ?? "");

  switch (mode) {
    case "personnes_nuits_prix":
      return { quantite: personnes, jours_nuits: nuits, prix_unitaire_eur: 0 };
    case "personnes_jours_prix":
      return { quantite: personnes, jours_nuits: nuits, prix_unitaire_eur: 0 };
    case "personnes_prix":
      return { quantite: personnes, jours_nuits: 1, prix_unitaire_eur: 0 };
    default:
      return { quantite: 1, jours_nuits: 1, prix_unitaire_eur: 0 };
  }
}

export function budgetLigneFormuleText(
  line: { quantite: number; jours_nuits: number; prix_unitaire_eur: number },
  mode: BudgetLigneSaisieMode
): string | null {
  const q = line.quantite || 0;
  const j = line.jours_nuits || 1;
  const p = line.prix_unitaire_eur || 0;
  if (!q && !p) return null;

  switch (mode) {
    case "personnes_nuits_prix":
      return `${q} × ${j} nuitées × ${p}`;
    case "personnes_jours_prix":
      return `${q} × ${j} j × ${p}`;
    case "personnes_prix":
      return `${q} × ${p}`;
    case "quantite_prix":
      return j > 1 ? `${q} × ${j} × ${p}` : `${q} × ${p}`;
    default:
      return null;
  }
}
