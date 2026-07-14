"use client";

import { Button } from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Input";
import { useAgeCategories } from "@/lib/hooks/useAgeCategories";
import { useUserPermissions } from "@/lib/hooks/useUserPermissions";
import {
  PROGRAMMATION_SURFACE_LABELS,
  PROGRAMMATION_TYPE_OPTIONS,
} from "@/lib/constants/programmation-joueurs";
import type { ProgrammationFilters } from "@/lib/types/programmation-joueurs";
import { FrenchDateInput } from "./FrenchDateInput";

type Props = {
  filters: ProgrammationFilters;
  onChange: (patch: Partial<ProgrammationFilters>) => void;
  onReset: () => void;
};

export function FiltresProgrammation({ filters, onChange, onReset }: Props) {
  const { categories: ageCategories } = useAgeCategories();
  const { hasCategoryRestrictions, lockedCategoryLabel, sanitizeCategoryParam } =
    useUserPermissions();
  const lockedCategory = sanitizeCategoryParam(filters.categorieJoueur) ?? lockedCategoryLabel;

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
        <Label>Catégorie d&apos;âge</Label>
        {hasCategoryRestrictions ? (
          <div className="rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 text-sm min-w-[120px]">
            {lockedCategory || "—"}
          </div>
        ) : (
          <Select
            value={filters.categorieJoueur ?? ""}
            onChange={(e) => onChange({ categorieJoueur: e.target.value || undefined })}
          >
            <option value="">Toutes</option>
            {ageCategories.map((c) => (
              <option key={c.id} value={c.code}>
                {c.label}
              </option>
            ))}
          </Select>
        )}
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
      <FrenchDateInput
        label="Du"
        value={filters.dateDebut}
        onChange={(iso) => onChange({ dateDebut: iso })}
        max={filters.dateFin}
      />
      <FrenchDateInput
        label="Au"
        value={filters.dateFin}
        onChange={(iso) => onChange({ dateFin: iso })}
        min={filters.dateDebut}
      />
      <Button variant="ghost" size="sm" onClick={onReset}>
        Réinitialiser
      </Button>
    </div>
  );
}
