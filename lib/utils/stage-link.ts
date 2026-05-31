/** Extrait l'identifiant stage depuis une note de provisionnement (ex. `stage_id:abc-123`). */
export function parseStageIdFromNotes(notes: string | null | undefined): string | null {
  if (!notes) return null;
  const m = notes.match(/stage_id:([^\s·]+)/);
  return m?.[1] ?? null;
}

export function isStageLinkedNotes(notes: string | null | undefined): boolean {
  return parseStageIdFromNotes(notes) !== null;
}
