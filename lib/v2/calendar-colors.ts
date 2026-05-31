/** Couleurs calendrier V2 — fond sombre : contrastes élevés, texte lisible. */

import { normalizeOfficialCategory } from "@/lib/constants/official-categories";

export type CalendarColorStyle = {  bg: string;
  border: string;
  text: string;
};

/** Catégories stage (fond saturé + bordure claire). */
export const CALENDAR_CATEGORY_COLORS: Record<string, CalendarColorStyle> = {
  U8: { bg: "#6d28d9", border: "#c4b5fd", text: "#ffffff" },
  U10: { bg: "#9d174d", border: "#f9a8d4", text: "#ffffff" },
  U12: { bg: "#075985", border: "#7dd3fc", text: "#ffffff" },
  U14: { bg: "#166534", border: "#86efac", text: "#ffffff" },
  U16: { bg: "#9a3412", border: "#fdba74", text: "#ffffff" },
  U18: { bg: "#5b21b6", border: "#c4b5fd", text: "#ffffff" },
  "Elite Pro": { bg: "#854d0e", border: "#fcd34d", text: "#ffffff" },
};

/** Stages sans catégorie reconnue (ex. CNE PRO ELITE) — éviter le gris trop sombre sur fond noir. */
export const CALENDAR_CATEGORY_DEFAULT: CalendarColorStyle = {
  bg: "#64748b",
  border: "#e2e8f0",
  text: "#ffffff",
};

export const CALENDAR_TYPE_COLORS = {
  hebergement: { bg: "#1e40af", border: "#93c5fd", text: "#ffffff" },
  terrain: { bg: "#6d28d9", border: "#c4b5fd", text: "#ffffff" },
  restauration: { bg: "#c2410c", border: "#fdba74", text: "#ffffff" },
  billet: { bg: "#9d174d", border: "#f9a8d4", text: "#ffffff" },
} as const satisfies Record<string, CalendarColorStyle>;

export function getCalendarCategoryStyle(categorie: string): CalendarColorStyle {
  const normalized = normalizeOfficialCategory(categorie) ?? categorie.trim();
  const key = Object.keys(CALENDAR_CATEGORY_COLORS).find((k) =>
    normalized.toUpperCase() === k.toUpperCase()
  );
  return key ? CALENDAR_CATEGORY_COLORS[key]! : CALENDAR_CATEGORY_DEFAULT;
}
export function categoryStyleToEventFields(style: CalendarColorStyle) {
  return {
    couleur: style.bg,
    borderColor: style.border,
    textColor: style.text,
  };
}

const TYPE_LABELS: Record<keyof typeof CALENDAR_TYPE_COLORS, string> = {
  hebergement: "Hébergement",
  terrain: "Terrain",
  restauration: "Restauration",
  billet: "Billet",
};

/** Items légende catégories stage (ordre fixe). */
export const CALENDAR_CATEGORY_LEGEND: Array<{ label: string } & CalendarColorStyle> = [
  { label: "U8", ...CALENDAR_CATEGORY_COLORS.U8! },
  { label: "U10", ...CALENDAR_CATEGORY_COLORS.U10! },
  { label: "U12", ...CALENDAR_CATEGORY_COLORS.U12! },
  { label: "U14", ...CALENDAR_CATEGORY_COLORS.U14! },
  { label: "U16", ...CALENDAR_CATEGORY_COLORS.U16! },
  { label: "U18", ...CALENDAR_CATEGORY_COLORS.U18! },
  { label: "Elite Pro", ...CALENDAR_CATEGORY_COLORS["Elite Pro"]! },
  { label: "Autre", ...CALENDAR_CATEGORY_DEFAULT },
];
/** Items légende types logistiques. */
export const CALENDAR_TYPE_LEGEND = (
  Object.keys(CALENDAR_TYPE_COLORS) as (keyof typeof CALENDAR_TYPE_COLORS)[]
).map((key) => ({
  label: TYPE_LABELS[key],
  ...CALENDAR_TYPE_COLORS[key],
}));
