"use client";

import { useMemo, useState } from "react";
import type { RapportStatut, RapportType } from "@/lib/rapports/types";
import type { StoredReportV2 } from "@/lib/v2/reports-storage";

export type RapportFilterState = {
  search: string;
  statut: RapportStatut | "all";
  dateDebut: string;
  dateFin: string;
};

const DEFAULT_FILTERS: RapportFilterState = {
  search: "",
  statut: "all",
  dateDebut: "",
  dateFin: "",
};

export function useRapportFilters(reports: StoredReportV2[], tabTypes: RapportType[]) {
  const [filters, setFilters] = useState<RapportFilterState>(DEFAULT_FILTERS);

  const filtered = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return reports.filter((r) => {
      if (!tabTypes.includes(r.type)) return false;
      if (filters.statut !== "all" && r.statut !== filters.statut) return false;
      if (q && !r.titre.toLowerCase().includes(q)) return false;
      if (filters.dateDebut) {
        const gen = r.generated_at.slice(0, 10);
        if (gen < filters.dateDebut) return false;
      }
      if (filters.dateFin) {
        const gen = r.generated_at.slice(0, 10);
        if (gen > filters.dateFin) return false;
      }
      return true;
    });
  }, [reports, tabTypes, filters]);

  function resetFilters() {
    setFilters(DEFAULT_FILTERS);
  }

  return { filters, setFilters, filtered, resetFilters };
}
