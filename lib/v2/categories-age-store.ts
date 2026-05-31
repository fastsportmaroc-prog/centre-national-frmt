import { DEFAULT_AGE_CATEGORIES, labelMoinsDeAns } from "@/lib/constants/categories-age-defaults";
import {
  isBirthYearCode,
  normalizeOfficialCategory,
  OFFICIAL_AGE_CODES,
} from "@/lib/constants/official-categories";
import type { AgeCategoryDefinition } from "@/lib/types/categories-age";
import { parseISO } from "date-fns";

const STORAGE_KEY = "frmt-v2:categories-age";
const OFFICIAL_CODES = new Set<string>([
  ...OFFICIAL_AGE_CODES,
]);
function sortCategories(list: AgeCategoryDefinition[]): AgeCategoryDefinition[] {
  return [...list].sort((a, b) => a.sortOrder - b.sortOrder || a.code.localeCompare(b.code));
}

/** Extrait le plafond d'âge depuis le code (U14 → 14). */
export function parseCategoryAgeCap(code: string): number | null {
  const m = code.trim().match(/^U\s*(\d{1,2})$/i);
  if (!m) return null;
  const n = Number.parseInt(m[1]!, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function normalizeCategories(list: AgeCategoryDefinition[]): AgeCategoryDefinition[] {
  const out: AgeCategoryDefinition[] = [];
  for (const c of list) {
    if (c.kind === "birthYear" && c.birthYear != null) {
      out.push({ ...c, code: String(c.birthYear), kind: "birthYear", maxAge: null });
      continue;
    }
    if (isBirthYearCode(c.code)) {
      out.push({
        ...c,
        kind: "birthYear",
        birthYear: Number.parseInt(c.code, 10),
        maxAge: null,
      });
      continue;
    }
    const norm = normalizeOfficialCategory(c.code);
    if (!norm || !OFFICIAL_CODES.has(norm)) continue;
    const cap = parseCategoryAgeCap(norm);
    if (cap != null) {
      out.push({
        ...c,
        code: norm,
        kind: "age",
        maxAge: cap,
        birthYear: null,
        label: c.label || labelMoinsDeAns(norm, cap),
      });
    } else {
      out.push({
        ...c,
        code: norm,
        kind: "label",
        maxAge: null,
        birthYear: null,
        label: c.label || norm,
      });
    }
  }
  return out;
}
export function getDefaultAgeCategories(): AgeCategoryDefinition[] {
  return sortCategories(normalizeCategories(DEFAULT_AGE_CATEGORIES.map((c) => ({ ...c }))));
}

/** Lecture (navigateur : localStorage ; serveur : défauts). */
export function getAgeCategories(): AgeCategoryDefinition[] {
  if (typeof window === "undefined") return getDefaultAgeCategories();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultAgeCategories();
    const parsed = JSON.parse(raw) as AgeCategoryDefinition[];
    if (!Array.isArray(parsed) || parsed.length === 0) return getDefaultAgeCategories();
    return sortCategories(normalizeCategories(parsed));
  } catch {
    return getDefaultAgeCategories();
  }
}

export function saveAgeCategories(categories: AgeCategoryDefinition[]): void {
  if (typeof window === "undefined") return;
  const normalized = sortCategories(normalizeCategories(categories));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  window.dispatchEvent(new CustomEvent("frmt:categories-age-changed"));
}

export function resetAgeCategories(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent("frmt:categories-age-changed"));
}

export function categoryCodes(categories: AgeCategoryDefinition[]): string[] {
  return categories.map((c) => c.code);
}

/** Catégories jeunes UN triées par plafond d'âge croissant. */
export function ageBands(categories: AgeCategoryDefinition[]): AgeCategoryDefinition[] {
  return categories
    .filter((c) => c.kind !== "birthYear" && c.birthYear == null)
    .map((c) => {
      const cap = parseCategoryAgeCap(c.code) ?? c.maxAge;
      return { c, cap };
    })
    .filter((x): x is { c: AgeCategoryDefinition; cap: number } => x.cap != null && x.cap > 0)
    .sort((a, b) => a.cap - b.cap)
    .map((x) => x.c);
}

/**
 * Catégorie UN (règle demandée) : âge révolu inférieur OU égal à N.
 * Ex. 12 → U12, 14 → U14, 16 → U16, 18 → U18.
 */
export function categorieCodeFromAge(
  age: number,
  categories: AgeCategoryDefinition[] = getDefaultAgeCategories()
): string {
  const bands = ageBands(categories);
  for (const c of bands) {
    const cap = parseCategoryAgeCap(c.code) ?? c.maxAge;
    if (cap != null && age <= cap) return c.code;
  }
  const elitePro = categories.find((c) => c.code === "Elite Pro");
  return elitePro?.code ?? bands[bands.length - 1]?.code ?? "U18";
}
export function birthYearFromDate(dateNaissance: string | null | undefined): number | null {
  if (!dateNaissance || dateNaissance.length < 4) return null;
  const y = Number.parseInt(dateNaissance.slice(0, 4), 10);
  return Number.isFinite(y) && y > 1900 && y < 2100 ? y : null;
}

/**
 * Âge pris en compte pour les catégories UN : âge révolu au 1er janvier de l'année en cours
 * (règle FFT / stages jeunes).
 */
export function calculerAgeCategorie(
  dateNaissance: string,
  referenceDate: Date = new Date()
): number {
  try {
    const birth = parseISO(dateNaissance.slice(0, 10));
    const ref = new Date(referenceDate.getFullYear(), 0, 1);
    let age = ref.getFullYear() - birth.getFullYear();
    const birthMonthDay = birth.getMonth() * 100 + birth.getDate();
    const refMonthDay = ref.getMonth() * 100 + ref.getDate();
    if (birthMonthDay > refMonthDay) age -= 1;
    return Math.max(0, age);
  } catch {
    return 0;
  }
}

/** Catégorie joueur depuis la date de naissance (tranches UN uniquement). */
export function categorieCodeFromJoueur(
  dateNaissance: string,
  categories: AgeCategoryDefinition[] = getDefaultAgeCategories()
): string {
  return categorieCodeFromAge(calculerAgeCategorie(dateNaissance), categories);
}

export function createAgeCategory(input: {
  code: string;
  maxAge: number | null;
  birthYear?: number | null;
  kind?: AgeCategoryDefinition["kind"];
  label?: string;
}): AgeCategoryDefinition {
  const code = input.code.trim();
  const birthYear = input.birthYear ?? null;
  const kind =
    input.kind ?? (birthYear != null ? "birthYear" : input.maxAge != null ? "age" : "label");
  const maxAge = kind === "birthYear" ? null : input.maxAge;
  const label =
    input.label?.trim() ||
    (birthYear != null
      ? `Nés en ${birthYear}`
      : maxAge != null && maxAge > 0
        ? labelMoinsDeAns(code, maxAge)
        : code);
  const sortOrder =
    birthYear != null
      ? birthYear
      : maxAge != null && maxAge > 0
        ? maxAge
        : Math.max(...getDefaultAgeCategories().map((c) => c.sortOrder), 0) + 10;
  return {
    id: crypto.randomUUID(),
    code,
    label,
    kind,
    maxAge,
    birthYear,
    sortOrder,
  };
}

export function createBirthYearCategory(year: number): AgeCategoryDefinition {
  return createAgeCategory({
    code: String(year),
    maxAge: null,
    birthYear: year,
    kind: "birthYear",
  });
}

/** Ajoute les catégories « Nés en YYYY » pour chaque année de la plage (sans doublon). */
export function mergeBirthYearCategories(
  existing: AgeCategoryDefinition[],
  fromYear: number,
  toYear: number
): AgeCategoryDefinition[] {
  const minY = Math.min(fromYear, toYear);
  const maxY = Math.max(fromYear, toYear);
  const have = new Set(
    existing.filter((c) => c.kind === "birthYear" && c.birthYear != null).map((c) => c.birthYear!)
  );
  const added: AgeCategoryDefinition[] = [];
  for (let y = maxY; y >= minY; y--) {
    if (!have.has(y)) added.push(createBirthYearCategory(y));
  }
  return sortCategories([...existing, ...added]);
}

export function groupLabelForBirthYear(year: number): string {
  return `Nés en ${year}`;
}

export function groupKeyFromJoueur(
  joueur: { date_naissance?: string | null; categorie_age?: string | null },
  mode: "categorie" | "birthYear"
): string {
  if (mode === "birthYear") {
    const y = birthYearFromDate(joueur.date_naissance);
    return y != null ? String(y) : "Année inconnue";
  }
  const norm = normalizeOfficialCategory(joueur.categorie_age);
  if (norm) return norm;
  if (joueur.date_naissance) {
    return categorieCodeFromJoueur(joueur.date_naissance);
  }
  return "Non renseigné";
}

export function normalizeCategoryCode(code: string): string {
  return normalizeOfficialCategory(code) ?? code.trim();
}
