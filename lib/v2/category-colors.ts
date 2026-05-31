import { getAgeCategories, getDefaultAgeCategories } from "@/lib/v2/categories-age-store";
import { normalizeOfficialCategory } from "@/lib/constants/official-categories";
import type { AgeCategoryDefinition } from "@/lib/types/categories-age";

/** Couleurs calendrier / badges par catégorie stage */

export const CATEGORY_COLORS: Record<string, { bg: string; border: string; text: string; label: string }> = {
  U8: { bg: "#f3e8ff", border: "#a855f7", text: "#6b21a8", label: "U8" },
  U10: { bg: "#fce7f3", border: "#f472b6", text: "#9d174d", label: "U10" },
  U12: { bg: "#dbeafe", border: "#3b82f6", text: "#1e40af", label: "U12" },
  U14: { bg: "#dcfce7", border: "#22c55e", text: "#166534", label: "U14" },
  U16: { bg: "#ffedd5", border: "#f97316", text: "#9a3412", label: "U16" },
  U18: { bg: "#ede9fe", border: "#8b5cf6", text: "#5b21b6", label: "U18" },
  "Elite Pro": { bg: "#fef9c3", border: "#c9a227", text: "#854d0e", label: "Elite Pro" },
};
function styleFromDefinition(c: AgeCategoryDefinition) {
  if (!c.color) return null;
  return { ...c.color, label: c.code };
}

export function getCategoryStyle(categorie: string) {
  const normalized = normalizeOfficialCategory(categorie) ?? categorie.trim();
  const list = typeof window !== "undefined" ? getAgeCategories() : getDefaultAgeCategories();

  const exact = list.find((c) => c.code.toLowerCase() === normalized.toLowerCase());  if (exact) {
    const s = styleFromDefinition(exact);
    if (s) return s;
  }

  const key = Object.keys(CATEGORY_COLORS).find((k) =>
    categorie.toUpperCase().includes(k.toUpperCase())
  );
  return CATEGORY_COLORS[key ?? "U16"] ?? CATEGORY_COLORS.U16!;
}
export const SURFACE_COLORS: Record<string, string> = {
  terre: "#d97706",
  battue: "#d97706",
  dur: "#2563eb",
  hard: "#2563eb",
  gazon: "#16a34a",
  grass: "#16a34a",
};

export function getSurfaceColor(surface: string | null | undefined): string {
  if (!surface) return "#6b7280";
  const s = surface.toLowerCase();
  for (const [k, v] of Object.entries(SURFACE_COLORS)) {
    if (s.includes(k)) return v;
  }
  return "#6b7280";
}
