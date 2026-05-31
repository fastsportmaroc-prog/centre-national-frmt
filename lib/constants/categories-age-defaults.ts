import type { AgeCategoryDefinition } from "@/lib/types/categories-age";

export function labelMoinsDeAns(code: string, maxAge: number): string {
  const min = Math.max(0, maxAge - 2);
  if (maxAge <= 10) return `${code} — ${maxAge} ans et moins`;
  return `${code} — ${min} à ${maxAge} ans`;
}

export const DEFAULT_AGE_CATEGORIES: AgeCategoryDefinition[] = [
  {
    id: "u8",
    code: "U8",
    kind: "age",
    label: labelMoinsDeAns("U8", 8),
    maxAge: 8,
    sortOrder: 1,
    color: { bg: "#f3e8ff", border: "#a855f7", text: "#6b21a8" },
  },
  {
    id: "u10",
    code: "U10",
    kind: "age",
    label: labelMoinsDeAns("U10", 10),
    maxAge: 10,
    sortOrder: 2,
    color: { bg: "#fce7f3", border: "#f472b6", text: "#9d174d" },
  },
  {
    id: "u12",
    code: "U12",
    kind: "age",
    label: labelMoinsDeAns("U12", 12),
    maxAge: 12,
    sortOrder: 3,
    color: { bg: "#dbeafe", border: "#3b82f6", text: "#1e40af" },
  },
  {
    id: "u14",
    code: "U14",
    kind: "age",
    label: labelMoinsDeAns("U14", 14),
    maxAge: 14,
    sortOrder: 4,
    color: { bg: "#dcfce7", border: "#22c55e", text: "#166534" },
  },
  {
    id: "u16",
    code: "U16",
    kind: "age",
    label: labelMoinsDeAns("U16", 16),
    maxAge: 16,
    sortOrder: 5,
    color: { bg: "#ffedd5", border: "#f97316", text: "#9a3412" },
  },
  {
    id: "u18",
    code: "U18",
    kind: "age",
    label: labelMoinsDeAns("U18", 18),
    maxAge: 18,
    sortOrder: 6,
    color: { bg: "#ede9fe", border: "#8b5cf6", text: "#5b21b6" },
  },
  {
    id: "elite-pro",
    code: "Elite Pro",
    kind: "label",
    label: "Elite Pro",
    maxAge: null,
    sortOrder: 7,
    color: { bg: "#fef9c3", border: "#c9a227", text: "#854d0e" },
  },
];
