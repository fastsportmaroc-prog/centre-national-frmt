/** Sync optionnelle passeport sur fiche joueur / coach — silencieux si colonnes SQL absentes. */

export type FichePasseportUpdateResult = {
  ok: boolean;
  error?: string;
  skippedColumns?: string[];
};

export async function syncFichePasseportFields(
  update: (
    payload: {
      passeport_numero: string | null;
      passeport_expiration: string | null;
    }
  ) => Promise<FichePasseportUpdateResult>,
  numero: string | null,
  expiration: string | null
): Promise<{ synced: boolean; skipped: boolean; error?: string }> {
  const res = await update({
    passeport_numero: numero,
    passeport_expiration: expiration,
  });

  if (!res.ok) {
    return { synced: false, skipped: false, error: res.error };
  }

  const skipped = Boolean(res.skippedColumns?.some((c) => c.startsWith("passeport_")));
  return { synced: !skipped, skipped };
}
