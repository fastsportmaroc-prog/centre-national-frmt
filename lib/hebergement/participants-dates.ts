import type { LettreHebergementException } from "@/lib/letters/letter-types";
import type {
  EntraineurV2,
  HebergementParticipantDates,
  HebergementParticipantsDatesStore,
  HebergementStageV2,
  JoueurV2,
} from "@/lib/types/v2";

const MARKER_START = "\n<!--HEBERG_PARTICIPANTS_JSON";
const MARKER_END = "\n-->";

export function stripParticipantsMarkerFromRemarques(remarques: string | null): string {
  if (!remarques) return "";
  const idx = remarques.indexOf(MARKER_START);
  if (idx < 0) return remarques.trim();
  return remarques.slice(0, idx).trim();
}

function normalizeParticipantDates(
  rows: HebergementParticipantDates[]
): HebergementParticipantDates[] {
  return rows
    .filter((r) => r.personne_id && r.personne_type)
    .map((r) => ({
      personne_id: r.personne_id,
      personne_type: r.personne_type,
      date_debut: (r.date_debut ?? "").slice(0, 10),
      date_fin: (r.date_fin ?? "").slice(0, 10),
      dates_personnalisees: !!r.dates_personnalisees,
      kitchenette: !!r.kitchenette,
      note: r.note?.trim() || undefined,
    }));
}

function parseStoredJson(raw: unknown): HebergementParticipantsDatesStore {
  if (!raw) return { actif: false, rows: [] };

  if (typeof raw === "object" && !Array.isArray(raw) && "rows" in raw) {
    const o = raw as HebergementParticipantsDatesStore;
    return {
      actif: !!o.actif,
      rows: normalizeParticipantDates(Array.isArray(o.rows) ? o.rows : []),
    };
  }

  if (Array.isArray(raw)) {
    const rows = normalizeParticipantDates(raw as HebergementParticipantDates[]);
    return {
      actif: rows.some((r) => r.dates_personnalisees),
      rows,
    };
  }

  return { actif: false, rows: [] };
}

export function parseParticipantsDatesPayload(
  hebergement: HebergementStageV2 | null | undefined
): HebergementParticipantsDatesStore {
  if (!hebergement) return { actif: false, rows: [] };

  const fromColumn = parseStoredJson(hebergement.participants_dates);
  if (fromColumn.rows.length > 0 || fromColumn.actif) return fromColumn;

  const remarques = hebergement.remarques;
  if (!remarques) return { actif: false, rows: [] };
  const start = remarques.indexOf(MARKER_START);
  if (start < 0) return { actif: false, rows: [] };
  const end = remarques.indexOf(MARKER_END, start);
  if (end < 0) return { actif: false, rows: [] };
  try {
    const json = remarques.slice(start + MARKER_START.length, end).trim();
    return parseStoredJson(JSON.parse(json));
  } catch {
    return { actif: false, rows: [] };
  }
}

/** Lignes enregistrées (sans fusion avec la liste participants). */
export function parseParticipantsDatesFromHebergement(
  hebergement: HebergementStageV2 | null | undefined
): HebergementParticipantDates[] {
  return parseParticipantsDatesPayload(hebergement).rows;
}

export function embedParticipantsDatesInRemarques(
  remarques: string | null,
  store: HebergementParticipantsDatesStore
): string {
  const base = stripParticipantsMarkerFromRemarques(remarques);
  if (!store.actif && store.rows.length === 0) return base;
  const block = `${MARKER_START}\n${JSON.stringify(store)}\n${MARKER_END}`;
  return base ? `${base}${block}` : block.trim();
}

/** Liste complète : participants du stage + dates enregistrées ou défaut hébergement. */
export function mergeParticipantDatesForStage(
  joueurs: Pick<JoueurV2, "id" | "nom" | "prenom">[],
  coachs: Pick<EntraineurV2, "id" | "nom" | "prenom">[],
  dateDebut: string,
  dateFin: string,
  stored: HebergementParticipantDates[]
): HebergementParticipantDates[] {
  const byKey = new Map(
    stored.map((r) => [`${r.personne_type}:${r.personne_id}`, r])
  );
  const out: HebergementParticipantDates[] = [];

  for (const j of joueurs) {
    const key = `joueur:${j.id}`;
    const prev = byKey.get(key);
    out.push(
      prev ?? {
        personne_id: j.id,
        personne_type: "joueur",
        date_debut: dateDebut,
        date_fin: dateFin,
        dates_personnalisees: false,
      }
    );
  }
  for (const c of coachs) {
    const key = `entraineur:${c.id}`;
    const prev = byKey.get(key);
    out.push(
      prev ?? {
        personne_id: c.id,
        personne_type: "entraineur",
        date_debut: dateDebut,
        date_fin: dateFin,
        dates_personnalisees: false,
      }
    );
  }
  return out;
}

export function participantDatesToLettreExceptions(
  rows: HebergementParticipantDates[],
  defaultDebut: string,
  defaultFin: string
): LettreHebergementException[] {
  return rows
    .filter(
      (r) =>
        r.dates_personnalisees ||
        r.date_debut !== defaultDebut ||
        r.date_fin !== defaultFin ||
        r.kitchenette ||
        r.note
    )
    .map((r) => ({
      personne_id: r.personne_id,
      personne_type: r.personne_type,
      date_debut: r.date_debut,
      date_fin: r.date_fin,
      kitchenette: r.kitchenette,
      note: r.note,
    }));
}

export function effectiveParticipantDates(
  row: HebergementParticipantDates,
  defaultDebut: string,
  defaultFin: string
): { date_debut: string; date_fin: string } {
  if (!row.dates_personnalisees) {
    return { date_debut: defaultDebut, date_fin: defaultFin };
  }
  return { date_debut: row.date_debut, date_fin: row.date_fin };
}
