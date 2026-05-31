/** Retire les colonnes absentes en base (erreur Supabase schema cache). */

export function parseMissingColumn(error?: string): string | null {
  if (!error) return null;
  const m = error.match(/could not find the '([^']+)' column/i);
  return m?.[1] ?? null;
}

export async function mutateOmitMissingColumns(
  initial: Record<string, unknown>,
  mutate: (payload: Record<string, unknown>) => Promise<{ ok: boolean; error?: string }>
): Promise<{ ok: boolean; error?: string; skippedColumns?: string[] }> {
  let candidate = { ...initial };
  const skipped: string[] = [];

  for (let attempt = 0; attempt < 10; attempt++) {
    if (Object.keys(candidate).length === 0) {
      return { ok: true, skippedColumns: skipped };
    }

    const res = await mutate(candidate);
    if (res.ok) {
      return skipped.length > 0 ? { ok: true, skippedColumns: skipped } : { ok: true };
    }

    const col = parseMissingColumn(res.error);
    if (!col || !(col in candidate)) {
      return res;
    }

    skipped.push(col);
    const next = { ...candidate };
    delete next[col];
    candidate = next;
  }

  return { ok: false, error: "Impossible de mettre à jour (colonnes manquantes en base)." };
}

export function isPasseportColumnMissing(skipped?: string[]): boolean {
  return Boolean(
    skipped?.some((c) => c === "passeport_numero" || c === "passeport_expiration")
  );
}
