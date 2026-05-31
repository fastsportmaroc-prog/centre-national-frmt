"use client";

import { Input, Select } from "@/components/ui/Input";
import {
  BUDGET_CATEGORY_CUSTOM,
  BUDGET_LIGNE_CATEGORIES,
  isPresetBudgetCategory,
} from "@/lib/constants/budget-previsionnel";

type Props = {
  value: string;
  onChange: (designation: string) => void;
};

export function BudgetLigneCategoryField({ value, onChange }: Props) {
  const isCustom = !isPresetBudgetCategory(value);
  const selectValue = isCustom ? BUDGET_CATEGORY_CUSTOM : value;

  return (
    <div className="space-y-1 min-w-[140px]">
      <Select
        value={selectValue}
        onChange={(e) => {
          const v = e.target.value;
          if (v === BUDGET_CATEGORY_CUSTOM) {
            onChange(isCustom ? value : "");
          } else {
            onChange(v);
          }
        }}
      >
        {BUDGET_LIGNE_CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
        <option value={BUDGET_CATEGORY_CUSTOM}>Autre (saisie libre)…</option>
      </Select>
      {(isCustom || selectValue === BUDGET_CATEGORY_CUSTOM) && (
        <Input
          placeholder="Nom de la ligne…"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="text-xs"
        />
      )}
    </div>
  );
}
