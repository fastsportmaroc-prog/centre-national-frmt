export type DiversLigne = {
  id: string;
  description: string;
  montant_eur: number;
  categorie: string;
};

export type BudgetVoyageForm = {
  stage_id: string;
  transport_type: string;
  nb_billets_joueurs: number;
  prix_billet_joueur: number;
  nb_billets_coachs: number;
  prix_billet_coach: number;
  nb_nuits: number;
  nb_chambres_joueurs: number;
  nb_chambres_coachs: number;
  nb_chambres_single: number;
  nb_chambres_double: number;
  total_repas_petit_dejeuner: number;
  total_repas_dejeuner: number;
  total_repas_diner: number;
  prix_petit_dejeuner: number;
  prix_dejeuner: number;
  prix_diner: number;
  prix_chambre_single: number;
  prix_chambre_double: number;
  taux_eur_mad: number;
  divers_lignes: DiversLigne[];
};

export const DEFAULT_TAUX_EUR_MAD = 10.8;
export const VOYAGE_STORAGE_KEY = "frmt-budget-voyage-v2";

export function emptyBudgetVoyage(stageId = ""): BudgetVoyageForm {
  return {
    stage_id: stageId,
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
    taux_eur_mad: DEFAULT_TAUX_EUR_MAD,
    divers_lignes: [],
  };
}

function normalizeForm(raw: BudgetVoyageForm): BudgetVoyageForm {
  const anyRaw = raw as unknown as Record<string, number>;
  const legacyTotalRepas = Number(anyRaw.total_repas ?? 0);
  const legacyPrixRepas = Number(anyRaw.prix_repas ?? 0);
  const legacyPrixNuit = Number(anyRaw.prix_nuit_chambre ?? 0);
  const totalChambres = Math.max(0, Number(raw.nb_chambres_joueurs ?? 0) + Number(raw.nb_chambres_coachs ?? 0));
  return {
    ...raw,
    nb_chambres_single: Number(raw.nb_chambres_single ?? 0),
    nb_chambres_double: Number(raw.nb_chambres_double ?? totalChambres),
    total_repas_petit_dejeuner: Number(raw.total_repas_petit_dejeuner ?? 0),
    total_repas_dejeuner: Number(raw.total_repas_dejeuner ?? 0),
    total_repas_diner: Number(raw.total_repas_diner ?? legacyTotalRepas),
    prix_petit_dejeuner: Number(raw.prix_petit_dejeuner ?? legacyPrixRepas),
    prix_dejeuner: Number(raw.prix_dejeuner ?? legacyPrixRepas),
    prix_diner: Number(raw.prix_diner ?? legacyPrixRepas),
    prix_chambre_single: Number(raw.prix_chambre_single ?? legacyPrixNuit),
    prix_chambre_double: Number(raw.prix_chambre_double ?? legacyPrixNuit),
  };
}

export function computeBudgetTotals(form: BudgetVoyageForm) {
  const transport =
    form.nb_billets_joueurs * form.prix_billet_joueur +
    form.nb_billets_coachs * form.prix_billet_coach;
  const hebergement =
    form.nb_nuits *
    (Math.max(0, form.nb_chambres_single) * form.prix_chambre_single +
      Math.max(0, form.nb_chambres_double) * form.prix_chambre_double);
  const restauration =
    Math.max(0, form.total_repas_petit_dejeuner) * form.prix_petit_dejeuner +
    Math.max(0, form.total_repas_dejeuner) * form.prix_dejeuner +
    Math.max(0, form.total_repas_diner) * form.prix_diner;
  const divers = form.divers_lignes.reduce((s, l) => s + l.montant_eur, 0);
  const totalEur = transport + hebergement + restauration + divers;
  const totalMad = totalEur * form.taux_eur_mad;
  return { transport, hebergement, restauration, divers, totalEur, totalMad };
}

export function loadBudgetVoyage(stageId: string): BudgetVoyageForm | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(`${VOYAGE_STORAGE_KEY}:${stageId}`);
    return raw ? normalizeForm(JSON.parse(raw) as BudgetVoyageForm) : null;
  } catch {
    return null;
  }
}

export function saveBudgetVoyage(form: BudgetVoyageForm): void {
  if (typeof window === "undefined" || !form.stage_id) return;
  try {
    localStorage.setItem(`${VOYAGE_STORAGE_KEY}:${form.stage_id}`, JSON.stringify(normalizeForm(form)));
  } catch {
    /* ignore */
  }
}

export function listAllBudgetVoyages(): BudgetVoyageForm[] {
  if (typeof window === "undefined") return [];
  const out: BudgetVoyageForm[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key?.startsWith(`${VOYAGE_STORAGE_KEY}:`)) continue;
    try {
      const raw = localStorage.getItem(key);
      if (raw) out.push(normalizeForm(JSON.parse(raw) as BudgetVoyageForm));
    } catch {
      /* skip */
    }
  }
  return out;
}
