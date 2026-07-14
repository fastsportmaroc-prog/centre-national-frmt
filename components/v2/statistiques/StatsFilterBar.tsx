"use client";

import { RotateCcw, Search, FileDown, FileText } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import type { SaisonOption, SexeFilter, StatistiquesFilters } from "@/lib/statistiques/types";
import { officialCategoryFilterOptions } from "@/lib/constants/official-categories";

type Options = {
  stages: { id: string; label: string }[];
  coachs: { id: string; label: string }[];
};

type Props = {
  filters: StatistiquesFilters;
  setFilter: <K extends keyof StatistiquesFilters>(
    key: K,
    value: StatistiquesFilters[K]
  ) => void;
  resetFilters: () => void;
  onApply: () => void;
  onExportCsv: () => void;
  onExportPdf: () => void;
  options: Options;
  loading?: boolean;
  categoryLocked?: boolean;
  lockedCategoryLabel?: string;
};

export function StatsFilterBar({
  filters,
  setFilter,
  resetFilters,
  onApply,
  onExportCsv,
  onExportPdf,
  options,
  loading,
  categoryLocked = false,
  lockedCategoryLabel = "",
}: Props) {
  return (
    <div className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-4">
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
        <label className="space-y-1 text-xs">
          <span className="text-muted">Saison</span>
          <Select
            value={filters.saison}
            onChange={(e) => setFilter("saison", e.target.value as SaisonOption)}
          >
            <option value="2025-2026">2025-2026</option>
            <option value="2024-2025">2024-2025</option>
            <option value="2023-2024">2023-2024</option>
          </Select>
        </label>
        <label className="space-y-1 text-xs">
          <span className="text-muted">Catégorie</span>
          {categoryLocked ? (
            <div className="rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 text-sm">
              {lockedCategoryLabel || filters.categorie}
            </div>
          ) : (
            <Select
              value={filters.categorie}
              onChange={(e) => setFilter("categorie", e.target.value)}
            >
              {officialCategoryFilterOptions(true).map((o) => (
                <option key={o.value || "toutes"} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          )}
        </label>
        <label className="space-y-1 text-xs">
          <span className="text-muted">Début période</span>
          <Input
            type="date"
            value={filters.start_date}
            onChange={(e) => setFilter("start_date", e.target.value)}
          />
        </label>
        <label className="space-y-1 text-xs">
          <span className="text-muted">Fin période</span>
          <Input
            type="date"
            value={filters.end_date}
            onChange={(e) => setFilter("end_date", e.target.value)}
          />
        </label>
        <label className="space-y-1 text-xs">
          <span className="text-muted">Stage</span>
          <Select
            value={filters.stage_id}
            onChange={(e) => setFilter("stage_id", e.target.value)}
          >
            <option value="">Tous</option>
            {options.stages.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label.slice(0, 40)}
              </option>
            ))}
          </Select>
        </label>
        <label className="space-y-1 text-xs">
          <span className="text-muted">Coach</span>
          <Select
            value={filters.coach_id}
            onChange={(e) => setFilter("coach_id", e.target.value)}
          >
            <option value="">Tous</option>
            {options.coachs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </Select>
        </label>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-lg border border-[var(--border)] p-0.5">
          {(
            [
              { id: "tous", label: "Tous" },
              { id: "M", label: "Masculin" },
              { id: "F", label: "Féminin" },
            ] as const
          ).map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setFilter("sexe", s.id as SexeFilter)}
              className={`rounded-md px-3 py-1.5 text-xs transition ${
                filters.sexe === s.id
                  ? "bg-frmt-green text-white"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={onApply} disabled={loading}>
            <Search className="h-4 w-4" />
            Filtrer
          </Button>
          <Button size="sm" variant="secondary" onClick={resetFilters}>
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
          <Button size="sm" variant="secondary" onClick={onExportCsv}>
            <FileDown className="h-4 w-4" />
            CSV
          </Button>
          <Button size="sm" variant="secondary" onClick={onExportPdf}>
            <FileText className="h-4 w-4" />
            PDF
          </Button>
        </div>
      </div>
    </div>
  );
}
