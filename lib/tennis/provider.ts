import { loadLocalTennisDataset } from "./local-data";
import { modeLabel, resolveTennisDataMode, type TennisDataMode } from "./mode";
import { syncFromApiTennis } from "./api-tennis-sync";
import { mockMoroccanProvider } from "./providers/mock-moroccan-provider";
import { canImportAsPlayerProfile } from "./morocco-filter";
import type { Joueur } from "@/lib/types/database";
import type {
  EvolutionClassement,
  MatchPerformance,
  PalmaresEntry,
  ProchainMatch,
  RankingSnapshot,
  StatsSurface,
  TournoiJoueur,
} from "@/lib/types/performances";

export type PerformanceSyncPayload = {
  provider: string;
  synced_at: string;
  mode: TennisDataMode;
  joueurs: Joueur[];
  matchs: MatchPerformance[];
  rankings: RankingSnapshot[];
  prochains: ProchainMatch[];
  tournois: TournoiJoueur[];
  palmares: PalmaresEntry[];
  evolution: Record<string, EvolutionClassement[]>;
  surfaces: Record<string, StatsSurface[]>;
};

export type TennisProviderStatus = {
  mode: TennisDataMode;
  modeLabel: string;
  liveApiConfigured: boolean;
  defaultSource: string;
};

export function getTennisProviderStatus(): TennisProviderStatus {
  const mode = resolveTennisDataMode();
  const liveApiConfigured = Boolean(process.env.TENNIS_DATA_API_KEY?.trim());
  return {
    mode,
    modeLabel: modeLabel(mode),
    liveApiConfigured,
    defaultSource:
      mode === "live_api"
        ? "api-tennis.com"
        : mode === "demo"
          ? "mock"
          : "/data/tennis",
  };
}

/** Charge un lot complet selon le mode actif */
export async function loadPerformanceSyncPayload(): Promise<PerformanceSyncPayload> {
  const mode = resolveTennisDataMode();
  const synced_at = new Date().toISOString();

  if (mode === "live_api") {
    const api = await syncFromApiTennis();
    return {
      ...api,
      mode: "live_api",
      prochains: api.prochains ?? [],
      tournois: api.tournois ?? [],
      palmares: api.palmares ?? [],
      evolution: {},
      surfaces: {},
    };
  }

  if (mode === "demo") {
    const provider = mockMoroccanProvider;
    const raw = await provider.fetchMoroccanPlayers();
    const joueurs = raw.filter((p) => canImportAsPlayerProfile(p));
    const ids = joueurs.map((j) => j.id);
    const [matchs, rankings, prochains, tournois, palmares] = await Promise.all([
      provider.fetchRecentMatches(ids),
      provider.fetchRankings(ids),
      provider.fetchUpcomingMatches(ids),
      provider.fetchTournaments(ids),
      provider.fetchPalmares(ids),
    ]);
    return {
      provider: provider.name,
      synced_at,
      mode: "demo",
      joueurs,
      matchs,
      rankings,
      prochains,
      tournois,
      palmares,
      evolution: {},
      surfaces: {},
    };
  }

  const ds = loadLocalTennisDataset();
  return {
    provider: `${ds.manifest.name} (dataset gratuit)`,
    synced_at,
    mode: "dataset",
    joueurs: ds.joueurs,
    matchs: ds.matchs,
    rankings: ds.rankings,
    prochains: ds.prochains,
    tournois: ds.tournois,
    palmares: ds.palmares,
    evolution: ds.evolution,
    surfaces: ds.surfaces,
  };
}

export { resolveTennisDataMode, modeLabel, type TennisDataMode };
