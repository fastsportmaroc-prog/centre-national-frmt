"use client";

import { Select } from "@/components/ui/Input";
import { useAgeCategories } from "@/lib/hooks/useAgeCategories";

type Props = {
  value: string;
  onChange: (code: string) => void;
  allowEmpty?: boolean;
  emptyLabel?: string;
  className?: string;
  disabled?: boolean;
};

export function CategorySelect({
  value,
  onChange,
  allowEmpty,
  emptyLabel = "— Choisir —",
  className,
  disabled,
}: Props) {
  const { categories } = useAgeCategories();

  return (
    <Select
      className={className}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
    >
      {allowEmpty && <option value="">{emptyLabel}</option>}
      {categories.map((c) => (
        <option key={c.id} value={c.code}>
          {c.code}
        </option>
      ))}
    </Select>
  );
}
