"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { OFFICIAL_AGE_CODES } from "@/lib/constants/official-categories";
import { saisonToDateRange } from "@/lib/statistiques/saison-utils";
import type {
  CategorieFilter,
  SaisonOption,
  SexeFilter,
  StatistiquesFilters,
  StatistiquesTab,
} from "@/lib/statistiques/types";

const DEFAULT_SAISON: SaisonOption = "2025-2026";

export const DEFAULT_STAT_FILTERS: StatistiquesFilters = {
  tab: "stages",
  saison: DEFAULT_SAISON,
  categorie: "Toutes",
  start_date: "",
  end_date: "",
  stage_id: "",
  coach_id: "",
  sexe: "tous",
};

function parseTab(v: string | null): StatistiquesTab {
  const tabs: StatistiquesTab[] = [
    "stages",
    "competitions",
    "comparatif",
    "financier",
    "joueurs",
  ];
  return tabs.includes(v as StatistiquesTab) ? (v as StatistiquesTab) : "stages";
}

function parseSaison(v: string | null): SaisonOption {
  if (v === "2024-2025" || v === "2023-2024" || v === "2025-2026") return v;
  return DEFAULT_SAISON;
}

function parseCategorie(v: string | null): string {
  if (!v || v === "Toutes") return "Toutes";
  if (OFFICIAL_AGE_CODES.includes(v)) return v;
  return "Toutes";
}

function parseSexe(v: string | null): SexeFilter {
  if (v === "M" || v === "F") return v;
  return "tous";
}

export function filtersFromSearchParams(sp: URLSearchParams): StatistiquesFilters {
  const saison = parseSaison(sp.get("saison"));
  const range = saisonToDateRange(saison);
  return {
    tab: parseTab(sp.get("tab")),
    saison,
    categorie: parseCategorie(sp.get("categorie")),
    start_date: sp.get("start_date") ?? range.debut,
    end_date: sp.get("end_date") ?? range.fin,
    stage_id: sp.get("stage_id") ?? "",
    coach_id: sp.get("coach_id") ?? "",
    sexe: parseSexe(sp.get("sexe")),
  };
}

export function filtersToSearchParams(filters: StatistiquesFilters): URLSearchParams {
  const p = new URLSearchParams();
  p.set("tab", filters.tab);
  p.set("saison", filters.saison);
  if (filters.categorie !== "Toutes") p.set("categorie", filters.categorie);
  if (filters.start_date) p.set("start_date", filters.start_date);
  if (filters.end_date) p.set("end_date", filters.end_date);
  if (filters.stage_id) p.set("stage_id", filters.stage_id);
  if (filters.coach_id) p.set("coach_id", filters.coach_id);
  if (filters.sexe !== "tous") p.set("sexe", filters.sexe);
  return p;
}

export function useStatistiquesFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filters = useMemo(
    () => filtersFromSearchParams(searchParams),
    [searchParams]
  );

  const setFilter = useCallback(
    <K extends keyof StatistiquesFilters>(key: K, value: StatistiquesFilters[K]) => {
      const next = { ...filters, [key]: value };
      if (key === "saison") {
        const range = saisonToDateRange(value as SaisonOption);
        next.start_date = range.debut;
        next.end_date = range.fin;
      }
      const qs = filtersToSearchParams(next).toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [filters, pathname, router]
  );

  const setFilters = useCallback(
    (patch: Partial<StatistiquesFilters>) => {
      const next = { ...filters, ...patch };
      const qs = filtersToSearchParams(next).toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [filters, pathname, router]
  );

  const resetFilters = useCallback(() => {
    const range = saisonToDateRange(DEFAULT_SAISON);
    setFilters({
      ...DEFAULT_STAT_FILTERS,
      tab: filters.tab,
      start_date: range.debut,
      end_date: range.fin,
    });
  }, [filters.tab, setFilters]);

  return { filters, setFilter, setFilters, resetFilters };
}
