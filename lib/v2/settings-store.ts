import type { TarifsBudgetSettings, TarifsTransportSettings } from "@/lib/types/v2";

const KEY_TRANSPORT = "frmt-v2:parametres-transport";
const KEY_BUDGET = "frmt-v2:parametres-budget";

const DEFAULTS: TarifsTransportSettings = {
  prix_billet_eur: 350,
  prix_billet_mad: 3850,
  taux_eur_mad: 11,
};

export const BUDGET_TARIFS_DEFAULTS: TarifsBudgetSettings = {
  prix_petit_dejeuner_mad: 70,
  prix_dejeuner_mad: 120,
  prix_diner_mad: 140,
  prix_chambre_single_mad: 600,
  prix_chambre_double_mad: 850,
  prix_terrain_jour_mad: 0,
};

export const TARIFS_BUDGET_CHANGED_EVENT = "frmt-v2:tarifs-budget-changed";

export function getTarifsTransport(): TarifsTransportSettings {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(KEY_TRANSPORT);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

export function saveTarifsTransport(settings: TarifsTransportSettings): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY_TRANSPORT, JSON.stringify(settings));
}

export function getTarifsBudget(): TarifsBudgetSettings {
  if (typeof window === "undefined") return BUDGET_TARIFS_DEFAULTS;
  try {
    const raw = localStorage.getItem(KEY_BUDGET);
    if (!raw) return BUDGET_TARIFS_DEFAULTS;
    return { ...BUDGET_TARIFS_DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return BUDGET_TARIFS_DEFAULTS;
  }
}

export function saveTarifsBudget(settings: TarifsBudgetSettings): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY_BUDGET, JSON.stringify(settings));
  window.dispatchEvent(new Event(TARIFS_BUDGET_CHANGED_EVENT));
}
