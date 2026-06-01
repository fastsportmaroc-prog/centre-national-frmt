/** Plages horaires fixes par créneau (labels FR + clés legacy). */
export const CRENEAU_TIMES = {
  matin: { start: "09:00", end: "13:00" },
  "apres-midi": { start: "14:00", end: "18:00" },
  apres_midi: { start: "14:00", end: "18:00" },
  journee: { start: "09:00", end: "18:00" },
  Matin: { start: "09:00", end: "13:00" },
  "Après-midi": { start: "14:00", end: "18:00" },
  "Journée complète": { start: "09:00", end: "18:00" },
} as const;

export type CreneauTimeKey = keyof typeof CRENEAU_TIMES;

export function normalizeCreneauKey(raw: string | null | undefined): CreneauTimeKey {
  const s = (raw ?? "").toLowerCase().replace(/-/g, "_").trim();
  if (s.includes("journee") || s.includes("journée")) return "journee";
  if (s.includes("apres") || s.includes("après")) return "apres_midi";
  if (s.includes("matin")) return "matin";
  return "journee";
}

export function getCreneauRange(creneau: string): { start: string; end: string } {
  const key = normalizeCreneauKey(creneau);
  return CRENEAU_TIMES[key] ?? CRENEAU_TIMES.journee;
}
