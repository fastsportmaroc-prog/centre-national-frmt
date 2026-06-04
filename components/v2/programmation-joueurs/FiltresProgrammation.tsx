"use client";

import { Button } from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Input";
import {
  PROGRAMMATION_SURFACE_LABELS,
  PROGRAMMATION_TYPE_OPTIONS,
} from "@/lib/constants/programmation-joueurs";
import type { ProgrammationFilters } from "@/lib/types/programmation-joueurs";

type Props = {
  filters: ProgrammationFilters;
  onChange: (patch: Partial<ProgrammationFilters>) => void;
  onReset: () => void;
};

const CATEGORIE_OPTIONS = [
  { value: "", label: "Toutes catégories" },
  { value: "Senior", label: "Seniors" },
  { value: "Junior", label: "Juniors" },
  { value: "Espoir", label: "Espoirs" },
];

export function FiltresProgrammation({ filters, onChange, onReset }: Props) {
  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-3">
      <div className="min-w-[140px] flex-1">
        <Label>Recherche joueur / événement</Label>
        <Input
          value={filters.search ?? ""}
          onChange={(e) => onChange({ search: e.target.value || undefined })}
          placeholder="Nom, ville, pays…"
        />
      </div>
      <div>
        <Label>Catégorie</Label>
        <Select
          value={filters.categorieJoueur ?? ""}
          onChange={(e) => onChange({ categorieJoueur: e.target.value || undefined })}
        >
          {CATEGORIE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label>Type</Label>
        <Select
          value={(Array.isArray(filters.type) ? filters.type[0] : filters.type) ?? ""}
          onChange={(e) =>
            onChange({
              type: (e.target.value || undefined) as ProgrammationFilters["type"],
            })
          }
        >
          <option value="">Tous types</option>
          {PROGRAMMATION_TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label>Surface</Label>
        <Select
          value={filters.surface ?? ""}
          onChange={(e) =>
            onChange({ surface: (e.target.value || undefined) as ProgrammationFilters["surface"] })
          }
        >
          <option value="">Toutes</option>
          {Object.entries(PROGRAMMATION_SURFACE_LABELS).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label>Du</Label>
        <Input
          type="date"
          value={filters.dateDebut?.slice(0, 10) ?? ""}
          onChange={(e) => onChange({ dateDebut: e.target.value || undefined })}
        />
      </div>
      <div>
        <Label>Au</Label>
        <Input
          type="date"
          value={filters.dateFin?.slice(0, 10) ?? ""}
          onChange={(e) => onChange({ dateFin: e.target.value || undefined })}
        />
      </div>
      <Button variant="ghost" size="sm" onClick={onReset}>
        Réinitialiser
      </Button>
    </div>
  );
}
