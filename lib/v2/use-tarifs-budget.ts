"use client";

import { useEffect, useState } from "react";
import type { TarifsBudgetSettings } from "@/lib/types/v2";
import {
  BUDGET_TARIFS_DEFAULTS,
  TARIFS_BUDGET_CHANGED_EVENT,
  getTarifsBudget,
} from "@/lib/v2/settings-store";

/** Tarifs paramètres — se met à jour après enregistrement (même onglet ou autre). */
export function useTarifsBudget(): TarifsBudgetSettings {
  const [tarifs, setTarifs] = useState<TarifsBudgetSettings>(BUDGET_TARIFS_DEFAULTS);

  useEffect(() => {
    const refresh = () => setTarifs(getTarifsBudget());
    refresh();
    window.addEventListener(TARIFS_BUDGET_CHANGED_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(TARIFS_BUDGET_CHANGED_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  return tarifs;
}
