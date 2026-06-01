"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Label, Select } from "@/components/ui/Input";
import type { StageProgrammeV2 } from "@/lib/types/v2";
import {
  LOGISTIQUE_PERIODE_OPTIONS,
  LOGISTIQUE_STATUT_OPTIONS,
  countActiveLogistiqueFilters,
  emptyLogistiqueFilters,
  type LogistiqueStageFilters,
} from "@/lib/v2/logistique-stage-filters";
import { Filter, RotateCcw, Search } from "lucide-react";

type Props = {
  stages: StageProgrammeV2[];
  filters: LogistiqueStageFilters;
  onChange: (filters: LogistiqueStageFilters) => void;
  resultCount: number;
  totalCount: number;
  /** Filtres spécifiques hébergement / restauration */
  extraFilters?: React.ReactNode;
};

export function LogistiqueStageFiltersBar({
  stages,
  filters,
  onChange,
  resultCount,
  totalCount,
  extraFilters,
}: Props) {
  const categories = [...new Set(stages.map((s) => s.categorie).filter(Boolean))].sort();
  const activeCount = countActiveLogistiqueFilters(filters);

  function patch(partial: Partial<LogistiqueStageFilters>) {
    onChange({ ...filters, ...partial });
  }

  function reset() {
    onChange(emptyLogistiqueFilters());
  }

  return (
    <Card className="space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium text-[var(--fg)]">
          <Filter className="h-4 w-4 text-frmt-green" aria-hidden />
          Recherche & filtres
          {activeCount > 0 ? (
            <span className="rounded-full bg-frmt-green/15 px-2 py-0.5 text-xs text-frmt-green">
              {activeCount} actif{activeCount > 1 ? "s" : ""}
            </span>
          ) : null}
        </div>
        <p className="text-xs text-muted">
          {resultCount} résultat{resultCount !== 1 ? "s" : ""} sur {totalCount}
        </p>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <Input
          className="pl-9"
          placeholder="Nom stage, catégorie, lieu, remarques…"
          value={filters.search}
          onChange={(e) => patch({ search: e.target.value })}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
        <div>
          <Label>Stage</Label>
          <Select
            className="mt-1"
            value={filters.stageId}
            onChange={(e) => patch({ stageId: e.target.value })}
          >
            <option value="">Tous les stages</option>
            {stages.map((s) => (
              <option key={s.id} value={s.id}>
                {s.stage_action}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Label>Catégorie</Label>
          <Select
            className="mt-1"
            value={filters.categorie}
            onChange={(e) => patch({ categorie: e.target.value })}
          >
            <option value="">Toutes</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Label>Statut</Label>
          <Select
            className="mt-1"
            value={filters.statut}
            onChange={(e) => patch({ statut: e.target.value })}
          >
            {LOGISTIQUE_STATUT_OPTIONS.map((o) => (
              <option key={o.value || "all"} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Label>Période rapide</Label>
          <Select
            className="mt-1"
            value={filters.periode}
            onChange={(e) =>
              patch({
                periode: e.target.value as LogistiqueStageFilters["periode"],
                dateDebut: "",
                dateFin: "",
              })
            }
          >
            {LOGISTIQUE_PERIODE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Label>Date début (du)</Label>
          <Input
            type="date"
            className="mt-1"
            value={filters.dateDebut}
            onChange={(e) =>
              patch({ dateDebut: e.target.value, periode: "all" })
            }
          />
        </div>

        <div>
          <Label>Date fin (au)</Label>
          <Input
            type="date"
            className="mt-1"
            value={filters.dateFin}
            onChange={(e) =>
              patch({ dateFin: e.target.value, periode: "all" })
            }
          />
        </div>
      </div>

      {extraFilters ? (
        <div className="grid gap-3 border-t border-[var(--border)] pt-3 sm:grid-cols-2 lg:grid-cols-4">
          {extraFilters}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2 border-t border-[var(--border)] pt-3">
        <Button type="button" variant="secondary" size="sm" onClick={reset}>
          <RotateCcw className="h-3.5 w-3.5" aria-hidden />
          Réinitialiser
        </Button>
      </div>
    </Card>
  );
}
