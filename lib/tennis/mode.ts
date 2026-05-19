/** Mode de données performances tennis */
export type TennisDataMode = "demo" | "dataset" | "live_api";

const MODES: TennisDataMode[] = ["demo", "dataset", "live_api"];

export function parseTennisDataMode(value: string | undefined): TennisDataMode | null {
  if (!value) return null;
  const v = value.trim().toLowerCase() as TennisDataMode;
  return MODES.includes(v) ? v : null;
}

/**
 * Résolution du mode (serveur).
 * Par défaut : dataset (gratuit, /data/tennis) — pas d'API payante.
 * live_api uniquement si explicitement demandé ET clé configurée.
 */
export function resolveTennisDataMode(): TennisDataMode {
  const explicit =
    parseTennisDataMode(process.env.TENNIS_DATA_MODE) ??
    parseTennisDataMode(process.env.NEXT_PUBLIC_TENNIS_DATA_MODE);

  if (explicit) {
    if (explicit === "live_api") {
      const hasKey = Boolean(process.env.TENNIS_DATA_API_KEY?.trim());
      return hasKey ? "live_api" : "dataset";
    }
    return explicit;
  }

  return "dataset";
}

export function modeLabel(mode: TennisDataMode): string {
  switch (mode) {
    case "demo":
      return "Démo (mock minimal)";
    case "dataset":
      return "Dataset gratuit FRMT (/data/tennis)";
    case "live_api":
      return "API live (api-tennis.com)";
  }
}
