import type { StageLogistiquePack } from "@/lib/types/stage-logistique";

const MARKER_START = "\n<!--STAGE_LOGISTIQUE_JSON";
const MARKER_END = "\n-->";

export function stripLogistiqueFromNotes(notes: string | null): string {
  if (!notes) return "";
  const idx = notes.indexOf(MARKER_START);
  if (idx < 0) return notes.trim();
  return notes.slice(0, idx).trim();
}

export function parseLogistiqueFromNotes(notes: string | null): StageLogistiquePack | null {
  if (!notes) return null;
  const start = notes.indexOf(MARKER_START);
  if (start < 0) return null;
  const end = notes.indexOf(MARKER_END, start);
  if (end < 0) return null;
  const json = notes.slice(start + MARKER_START.length, end).trim();
  try {
    return JSON.parse(json) as StageLogistiquePack;
  } catch {
    return null;
  }
}

export function embedLogistiqueInNotes(
  notes: string | null,
  pack: StageLogistiquePack
): string {
  const base = stripLogistiqueFromNotes(notes);
  const block = `${MARKER_START}\n${JSON.stringify(pack)}\n${MARKER_END}`;
  return base ? `${base}${block}` : block.trim();
}

export function emptyLogistiquePack(): StageLogistiquePack {
  return {
    joueur_ids: [],
    entraineur_ids: [],
    hebergement: null,
    restauration: null,
    terrains: null,
    dernier_provisionnement: null,
  };
}
