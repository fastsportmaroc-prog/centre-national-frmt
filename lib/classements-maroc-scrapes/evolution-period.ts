/** Bornes de période pour le graphique d'évolution Classement International. */

export type EvolutionPeriodPreset = "mois" | "trimestre" | "semestre" | "custom";

export function isoDateUTC(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function rangeForEvolutionPreset(
  preset: EvolutionPeriodPreset,
  custom?: { from?: string; to?: string }
): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to);

  if (preset === "custom") {
    const toIso = custom?.to?.trim() || isoDateUTC(to);
    const fromIso = custom?.from?.trim() || isoDateUTC(from);
    return fromIso <= toIso ? { from: fromIso, to: toIso } : { from: toIso, to: fromIso };
  }

  if (preset === "mois") from.setUTCMonth(from.getUTCMonth() - 1);
  else if (preset === "trimestre") from.setUTCMonth(from.getUTCMonth() - 3);
  else from.setUTCMonth(from.getUTCMonth() - 6);

  return { from: isoDateUTC(from), to: isoDateUTC(to) };
}
