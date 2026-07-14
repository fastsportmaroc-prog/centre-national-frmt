"use client";

import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Input";
import { useAgeCategories } from "@/lib/hooks/useAgeCategories";
import { OFFICIAL_UN_CODES } from "@/lib/constants/official-categories";

type Props = {
  selected: Set<string>;
  editable: boolean;
  limitEnabled: boolean;
  onLimitEnabledChange: (v: boolean) => void;
  onToggle: (code: string) => void;
  onSelectAll: () => void;
  onSelectNone: () => void;
  onSelectJuniors: () => void;
  onSelectElitePro: () => void;
};

/** Restriction d'accès par catégorie de joueurs (U8, U10, Elite Pro…). */
export function AdminUserPlayerCategoriesForm({
  selected,
  editable,
  limitEnabled,
  onLimitEnabledChange,
  onToggle,
  onSelectAll,
  onSelectNone,
  onSelectJuniors,
  onSelectElitePro,
}: Props) {
  const { categories } = useAgeCategories();

  return (
    <div className="space-y-2">
      <Label className="block text-sm font-medium">Accès par catégorie de joueurs</Label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={limitEnabled}
          onChange={(e) => onLimitEnabledChange(e.target.checked)}
          disabled={!editable}
        />
        Limiter les joueurs visibles à certaines catégories
      </label>
      {limitEnabled && (
        <>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="secondary" disabled={!editable} onClick={onSelectAll}>
              Toutes
            </Button>
            <Button type="button" size="sm" variant="secondary" disabled={!editable} onClick={onSelectNone}>
              Aucune
            </Button>
            <Button type="button" size="sm" variant="secondary" disabled={!editable} onClick={onSelectJuniors}>
              Juniors (U8–U18)
            </Button>
            <Button type="button" size="sm" variant="secondary" disabled={!editable} onClick={onSelectElitePro}>
              Elite Pro
            </Button>
          </div>
          <div className="max-h-40 overflow-y-auto rounded-lg border border-[var(--border)] p-2">
            <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
              {categories.map((c) => (
                <label key={c.code} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selected.has(c.code)}
                    onChange={() => onToggle(c.code)}
                    disabled={!editable}
                  />
                  <span>{c.label || c.code}</span>
                </label>
              ))}
            </div>
          </div>
          <p className="text-xs text-muted">
            {selected.size} catégorie{selected.size > 1 ? "s" : ""} sélectionnée. Les listes
            Joueurs, Programmes et Planning seront filtrées.
          </p>
        </>
      )}
      {!limitEnabled && (
        <p className="text-xs text-muted">Toutes les catégories de joueurs sont visibles.</p>
      )}
    </div>
  );
}

export function defaultJuniorsCategorySet(codes: string[]): Set<string> {
  const juniorSet = new Set<string>(OFFICIAL_UN_CODES);
  return new Set(codes.filter((c) => juniorSet.has(c as (typeof OFFICIAL_UN_CODES)[number])));
}
