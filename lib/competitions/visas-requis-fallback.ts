/** Repli si la colonne SQL `visas_requis` n'est pas encore migrée (marqueur caché dans notes). */

const MARKER_RE = /<!--\s*frmt-visas-requis\s*:\s*(0|1)\s*-->/i;

export function parseVisasRequisFromNotes(notes: string | null | undefined): boolean | null {
  const m = notes?.match(MARKER_RE);
  if (!m) return null;
  return m[1] === "1";
}

export function stripVisasMarkerFromNotes(notes: string | null | undefined): string | null {
  const s = (notes ?? "").replace(MARKER_RE, "").trim();
  return s.length > 0 ? s : null;
}

export function embedVisasRequisInNotes(
  userNotes: string | null | undefined,
  visasRequis: boolean
): string | null {
  const base = stripVisasMarkerFromNotes(userNotes);
  const marker = `<!--frmt-visas-requis:${visasRequis ? 1 : 0}-->`;
  if (!base) return marker;
  return `${base}\n${marker}`;
}

export function resolveVisasRequis(
  columnValue: boolean | null | undefined,
  notes: string | null | undefined
): boolean {
  if (columnValue === true || columnValue === false) return columnValue;
  return parseVisasRequisFromNotes(notes) ?? false;
}

export function normalizeCompetitionVisas<T extends { visas_requis?: boolean; notes?: string | null }>(
  row: T
): T & { visas_requis: boolean; notes: string | null } {
  return {
    ...row,
    visas_requis: resolveVisasRequis(row.visas_requis, row.notes),
    notes: stripVisasMarkerFromNotes(row.notes),
  };
}

export const VISAS_REQUIS_MIGRATION_HINT =
  "Pour activer la colonne dédiée, exécutez lib/db/migrations/competitions_visas_requis.sql dans Supabase (SQL Editor).";
