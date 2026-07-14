import type {
  ClassementMarocDiscipline,
  ClassementMarocType,
} from "@/lib/types/classements-maroc-scrapes";

export const DOUBLE_SOURCE_SUFFIX = "#D";

export type ParsedMarocPlayerKey = {
  type: ClassementMarocType;
  discipline: ClassementMarocDiscipline;
  idOrName: string;
};

/** ID stocké en base (ajoute #D pour les doubles). */
export function toStoredSourcePlayerId(
  id: string | null | undefined,
  discipline: ClassementMarocDiscipline
): string | null {
  if (!id) return null;
  const base = stripDoubleSuffix(id);
  return discipline === "double" ? `${base}${DOUBLE_SOURCE_SUFFIX}` : base;
}

export function stripDoubleSuffix(id: string): string {
  return id.endsWith(DOUBLE_SOURCE_SUFFIX) ? id.slice(0, -DOUBLE_SOURCE_SUFFIX.length) : id;
}

export function disciplineFromStoredSourceId(
  sourcePlayerId: string | null | undefined,
  sourceUrl?: string | null
): ClassementMarocDiscipline {
  if (sourcePlayerId?.endsWith(DOUBLE_SOURCE_SUFFIX)) return "double";
  if (sourceUrl && /\/rankings\/doubles|rankDoubles|metric=doubles/i.test(sourceUrl)) {
    return "double";
  }
  return "simple";
}

/** Clé stable : ATP:simple:slug/code ou WTA:double:330733 */
export function playerKey(row: {
  type_classement: ClassementMarocType;
  discipline?: ClassementMarocDiscipline | null;
  source_player_id: string | null;
  nom_joueur: string;
  source_url?: string | null;
}): string {
  const discipline =
    row.discipline ??
    disciplineFromStoredSourceId(row.source_player_id, row.source_url) ??
    "simple";
  const rawId = row.source_player_id ? stripDoubleSuffix(row.source_player_id) : row.nom_joueur;
  return `${row.type_classement}:${discipline}:${rawId}`;
}

/**
 * Accepte :
 * - WTA:simple:330733
 * - ATP:slug/code (legacy)
 * - WTA:330733 (legacy → simple)
 */
export function parsePlayerHistoryKey(key: string): ParsedMarocPlayerKey | null {
  const first = key.indexOf(":");
  if (first < 0) return null;
  const type = key.slice(0, first);
  if (type !== "ATP" && type !== "WTA") return null;

  let rest = key.slice(first + 1);
  let discipline: ClassementMarocDiscipline = "simple";

  if (rest.startsWith("simple:") || rest.startsWith("double:")) {
    discipline = rest.startsWith("double:") ? "double" : "simple";
    rest = rest.slice(7);
  }

  if (!rest) return null;
  return { type, discipline, idOrName: rest };
}

/** ATP = slug/code ; WTA = id numérique (sans suffixe #D). */
export function isSourcePlayerId(idOrName: string): boolean {
  const base = stripDoubleSuffix(idOrName);
  return base.includes("/") || /^\d+$/.test(base);
}
