/**
 * Catégories officielles FRMT V2 — UN jeunes + Elite Pro + cohortes par année de naissance.
 */

export const OFFICIAL_UN_CODES = ["U8", "U10", "U12", "U14", "U16", "U18"] as const;
export const ELITE_PRO_CODE = "Elite Pro" as const;
export const OFFICIAL_SENIOR_CODES = [ELITE_PRO_CODE] as const;

export type OfficialUnCode = (typeof OFFICIAL_UN_CODES)[number];

export const OFFICIAL_AGE_CODES: readonly string[] = [
  ...OFFICIAL_UN_CODES,
  ELITE_PRO_CODE,
];

/** Alias legacy → code officiel */
const LEGACY_ALIASES: Record<string, string> = {
  senior: ELITE_PRO_CODE,
  seniors: ELITE_PRO_CODE,
  sénior: ELITE_PRO_CODE,
  séniors: ELITE_PRO_CODE,
  junior: "U18",
  juniors: "U18",
  "elite pro": ELITE_PRO_CODE,
  elitepro: ELITE_PRO_CODE,
  "élite pro": ELITE_PRO_CODE,
  elite: ELITE_PRO_CODE,
  élite: ELITE_PRO_CODE,
  pro: ELITE_PRO_CODE,
  elite_pro: ELITE_PRO_CODE,
  u9: "U8",
  u11: "U10",
  u13: "U12",
  u15: "U14",
  u17: "U16",
  u19: "U18",
  u20: "U18",
  para: "U18",
  autre: "U18",
  autres: "U18",
};

function normalizeKey(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Normalise un code Uxx (U 14 → U14). */
export function normalizeUnCode(raw: string): string | null {
  const m = raw.trim().match(/^U\s*(\d{1,2})$/i);
  if (!m) return null;
  const code = `U${m[1]}`;
  return OFFICIAL_UN_CODES.includes(code as OfficialUnCode) ? code : null;
}

export function isBirthYearCode(code: string): boolean {
  return /^(19|20)\d{2}$/.test(code.trim());
}

export function isOfficialCategoryCode(code: string): boolean {
  const c = code.trim();
  if (OFFICIAL_AGE_CODES.some((o) => o.toLowerCase() === c.toLowerCase())) return true;
  if (isBirthYearCode(c)) return true;
  return normalizeOfficialCategory(c) !== null;
}

/**
 * Ramène toute valeur legacy vers U8–U18, Elite Pro ou une année de naissance.
 */
export function normalizeOfficialCategory(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const trimmed = raw.trim();

  if (isBirthYearCode(trimmed)) return trimmed;

  const un = normalizeUnCode(trimmed);
  if (un) return un;

  if (trimmed.toLowerCase() === "elite pro" || trimmed.toLowerCase() === "elitepro") {
    return ELITE_PRO_CODE;
  }
  if (trimmed.toUpperCase() === "ELITE" || trimmed.toUpperCase() === "PRO") {
    return ELITE_PRO_CODE;
  }

  const alias = LEGACY_ALIASES[normalizeKey(trimmed)];
  if (alias) return alias;

  return null;
}

/** Catégorie affichée : normalise ou retourne null si invalide. */
export function resolveOfficialCategory(
  stored: string | null | undefined,
  computedFromBirth?: string | null
): string {
  const norm = normalizeOfficialCategory(stored);
  if (norm) return norm;
  if (computedFromBirth) {
    const fromBirth = normalizeOfficialCategory(computedFromBirth);
    if (fromBirth) return fromBirth;
  }
  return computedFromBirth ?? "U18";
}

export function officialCategoryFilterOptions(includeAll = true): { value: string; label: string }[] {
  const base = OFFICIAL_AGE_CODES.map((code) => ({ value: code, label: code }));
  return includeAll ? [{ value: "", label: "Toutes" }, ...base] : base;
}

export function matchesOfficialCategoryFilter(
  filter: string,
  playerOrStageCategory: string
): boolean {
  if (!filter || filter === "Toutes") return true;
  const normalized = normalizeOfficialCategory(playerOrStageCategory);
  if (!normalized) return false;
  const normFilter = normalizeOfficialCategory(filter) ?? filter;
  return normalized.toLowerCase() === normFilter.toLowerCase();
}
