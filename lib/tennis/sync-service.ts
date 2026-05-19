import { canImportAsPlayerProfile } from "./morocco-filter";
import { loadLocalTennisDataset } from "./local-data";
import type { TennisDataMode } from "./mode";
import {
  getTennisProviderStatus,
  loadPerformanceSyncPayload,
  modeLabel,
  type PerformanceSyncPayload,
} from "./provider";
import { mockMoroccanProvider } from "./providers/mock-moroccan-provider";
import { fetchTennisApiStatus, syncTennisFromApi } from "./tennis-api-client";
import type { Joueur } from "@/lib/types/database";

export function filterMoroccanJoueurs(joueurs: Joueur[]): Joueur[] {
  return joueurs.filter(
    (j) => j.is_frmt_tracked && canImportAsPlayerProfile(j)
  );
}

export type SyncResult = {
  provider: string;
  synced_at: string;
  joueurs_marocains: number;
  matchs: number;
  rankings: number;
  mode: TennisDataMode;
};

async function buildClientPayload(mode: TennisDataMode): Promise<PerformanceSyncPayload> {
  const synced_at = new Date().toISOString();

  if (mode === "live_api") {
    return syncTennisFromApi();
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

/** Synchronise uniquement les données des joueurs marocains */
export async function syncMoroccanPerformances(): Promise<SyncResult> {
  let payload: PerformanceSyncPayload;

  if (typeof window !== "undefined") {
    const status = await fetchTennisApiStatus();
    payload = await buildClientPayload(status.mode);
    const { mockStore } = await import("@/lib/data/mock/store");
    mockStore.setPerformanceSyncFull(payload);
    const { ensureFrmtClassementInMock } = await import("@/lib/data/frmt-classement");
    ensureFrmtClassementInMock();
    const { logHistorique } = await import("@/lib/audit/historique");
    await logHistorique({
      action: "modification",
      module: "performances",
      entite_id: null,
      entite_label: `Sync performances (${payload.mode})`,
      ancienne_valeur: null,
      nouvelle_valeur: `${payload.joueurs.length} joueurs MAR, ${payload.matchs.length} matchs`,
      commentaire: payload.provider,
    });
  } else {
    payload = await loadPerformanceSyncPayload();
  }

  return {
    provider: payload.provider,
    synced_at: payload.synced_at,
    joueurs_marocains: payload.joueurs.length,
    matchs: payload.matchs.length,
    rankings: payload.rankings.length,
    mode: payload.mode,
  };
}

export async function getProviderInfo(): Promise<{
  name: string;
  configured: boolean;
  mode: TennisDataMode;
  modeLabel: string;
}> {
  if (typeof window !== "undefined") {
    const s = await fetchTennisApiStatus();
    return {
      name: s.modeLabel,
      configured: s.mode === "live_api" && s.liveApiConfigured,
      mode: s.mode,
      modeLabel: modeLabel(s.mode),
    };
  }
  const s = getTennisProviderStatus();
  return {
    name: s.modeLabel,
    configured: s.mode === "live_api" && s.liveApiConfigured,
    mode: s.mode,
    modeLabel: modeLabel(s.mode),
  };
}
