"use client";

import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import type { RapportFilterState } from "@/lib/rapports/hooks/useRapportFilters";
import { RAPPORT_STATUT_LABELS } from "@/lib/rapports/types";
import type { RapportStatut } from "@/lib/rapports/types";
import { RotateCcw } from "lucide-react";

type Props = {
  filters: RapportFilterState;
  onChange: (patch: Partial<RapportFilterState>) => void;
  onReset: () => void;
};

export function RapportFilters({ filters, onChange, onReset }: Props) {
  return (
    <div className="flex flex-wrap items-end gap-2 rounded-lg border border-[#2a2d3a] bg-[#1a1d27] p-3">
      <div className="min-w-[180px] flex-1">
        <label className="mb-1 block text-[10px] uppercase text-muted">Recherche</label>
        <Input
          placeholder="Titre du rapport…"
          value={filters.search}
          onChange={(e) => onChange({ search: e.target.value })}
        />
      </div>
      <div>
        <label className="mb-1 block text-[10px] uppercase text-muted">Du</label>
        <Input
          type="date"
          value={filters.dateDebut}
          onChange={(e) => onChange({ dateDebut: e.target.value })}
          className="w-36"
        />
      </div>
      <div>
        <label className="mb-1 block text-[10px] uppercase text-muted">Au</label>
        <Input
          type="date"
          value={filters.dateFin}
          onChange={(e) => onChange({ dateFin: e.target.value })}
          className="w-36"
        />
      </div>
      <div>
        <label className="mb-1 block text-[10px] uppercase text-muted">Statut</label>
        <Select
          value={filters.statut}
          onChange={(e) => onChange({ statut: e.target.value as RapportStatut | "all" })}
          className="min-w-[140px]"
        >
          <option value="all">Tous</option>
          {(Object.keys(RAPPORT_STATUT_LABELS) as RapportStatut[]).map((s) => (
            <option key={s} value={s}>
              {RAPPORT_STATUT_LABELS[s]}
            </option>
          ))}
        </Select>
      </div>
      <Button size="sm" variant="secondary" onClick={onReset}>
        <RotateCcw className="mr-1 h-3.5 w-3.5" />
        Réinitialiser
      </Button>
    </div>
  );
}
