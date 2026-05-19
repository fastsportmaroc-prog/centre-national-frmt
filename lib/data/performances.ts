/**
 * Performances tennis : données locales (JSON / mockStore côté client).
 * Pas encore migrées vers Supabase — mockStore conservé pour l'état navigateur.
 */
import { loadLocalTennisDataset } from "@/lib/tennis/local-data";
import { canImportAsPlayerProfile } from "@/lib/tennis/morocco-filter";
import { resolveTennisDataMode } from "@/lib/tennis/mode";
import { filterMoroccanJoueurs, getProviderInfo } from "@/lib/tennis/sync-service";
import type { Joueur } from "@/lib/types/database";
import type {
  MatchPerformance,
  PerformancesDashboard,
  PerformancesJoueur,
  ProchainMatch,
  RankingSnapshot,
  TournoiJoueur,
} from "@/lib/types/performances";
import { getJoueurs } from "./joueurs";
import {
  seedPerformanceEvolution,
  seedPerformanceSurfaces,
} from "./mock/seed-performances";
import { mockStore, getMockSeed } from "./mock/store";

async function getMoroccanTrackedJoueurs(): Promise<Joueur[]> {
  const all = await getJoueurs();
  return filterMoroccanJoueurs(
    all.filter((j) => canImportAsPlayerProfile(j) && (j.is_frmt_tracked ?? j.is_marocain))
  );
}

function fromMock() {
  if (typeof window !== "undefined") return null;
  const base = getMockSeed();
  if (resolveTennisDataMode() !== "dataset") return base;
  const ds = loadLocalTennisDataset();
  const trackedIds = new Set(ds.joueurs.map((j) => j.id));
  return {
    ...base,
    joueurs: [
      ...ds.joueurs,
      ...base.joueurs.filter((j) => !j.is_frmt_tracked || !trackedIds.has(j.id)),
    ],
    performanceRankings: ds.rankings,
    performanceMatchs: ds.matchs,
    performanceProchains: ds.prochains,
    performanceTournois: ds.tournois,
    performancePalmares: ds.palmares,
  };
}

export async function getPerformancesDashboard(): Promise<PerformancesDashboard> {
  const joueurs = await getMoroccanTrackedJoueurs();
  const ids = joueurs.map((j) => j.id);

  const seed = fromMock();
  const rankings = seed
    ? seed.performanceRankings.filter((r) => ids.includes(r.joueur_id))
    : mockStore.getPerformanceRankings().filter((r) => ids.includes(r.joueur_id));
  const matchs = seed
    ? seed.performanceMatchs.filter((m) => ids.includes(m.joueur_id))
    : mockStore.getPerformanceMatchs().filter((m) => ids.includes(m.joueur_id));
  const prochains = seed
    ? seed.performanceProchains.filter((m) => ids.includes(m.joueur_id))
    : mockStore.getPerformanceProchains().filter((m) => ids.includes(m.joueur_id));
  const palmares = seed
    ? seed.performancePalmares.filter((p) => ids.includes(p.joueur_id))
    : mockStore.getPerformancePalmares().filter((p) => ids.includes(p.joueur_id));

  const byJoueur = (id: string) => joueurs.find((j) => j.id === id)!;

  const topAtp = rankings
    .filter((r) => r.circuit === "atp" || r.circuit === "challenger")
    .sort((a, b) => a.rang - b.rang)
    .slice(0, 5)
    .map((r) => ({ joueur: byJoueur(r.joueur_id), ranking: r }));

  const topWta = rankings
    .filter((r) => r.circuit === "wta")
    .sort((a, b) => a.rang - b.rang)
    .slice(0, 5)
    .map((r) => ({ joueur: byJoueur(r.joueur_id), ranking: r }));

  const topJuniors = rankings
    .filter((r) => r.circuit === "itf_junior")
    .sort((a, b) => a.rang - b.rang)
    .slice(0, 5)
    .map((r) => ({ joueur: byJoueur(r.joueur_id), ranking: r }));

  const progressions = rankings
    .filter((r) => r.variation != null && r.variation > 0)
    .sort((a, b) => (b.variation ?? 0) - (a.variation ?? 0))
    .slice(0, 5)
    .map((r) => ({
      joueur: byJoueur(r.joueur_id),
      variation: r.variation!,
      circuit: r.circuit,
    }));

  const meta = seed
    ? { provider: "Mock FRMT", synced_at: new Date().toISOString() }
    : mockStore.getPerformanceSyncMeta();

  return {
    topAtpHommes: topAtp,
    topWtaFemmes: topWta,
    topJuniorsItf: topJuniors,
    resultatsRecents: [...matchs].sort((a, b) =>
      b.date_match.localeCompare(a.date_match)
    ).slice(0, 8),
    prochainsMatchs: [...prochains].sort((a, b) =>
      a.date_prevue.localeCompare(b.date_prevue)
    ).slice(0, 6),
    progressions,
    palmaresMaroc: palmares.slice(0, 6),
    derniere_sync: meta?.synced_at ?? null,
    provider: meta?.provider ?? (await getProviderInfo()).name,
  };
}

export async function getPerformancesJoueur(
  joueurId: string
): Promise<PerformancesJoueur | null> {
  const joueurs = await getMoroccanTrackedJoueurs();
  const joueur = joueurs.find((j) => j.id === joueurId);
  if (!joueur) return null;

  const seed = fromMock();
  const rankings = (
    seed
      ? seed.performanceRankings
      : mockStore.getPerformanceRankings()
  ).filter((r) => r.joueur_id === joueurId);
  const matchs = (
    seed ? seed.performanceMatchs : mockStore.getPerformanceMatchs()
  ).filter((m) => m.joueur_id === joueurId);
  const prochains = (
    seed ? seed.performanceProchains : mockStore.getPerformanceProchains()
  ).filter((m) => m.joueur_id === joueurId);
  const tournois = (
    seed ? seed.performanceTournois : mockStore.getPerformanceTournois()
  ).filter((t) => t.joueur_id === joueurId);
  const palmares = (
    seed ? seed.performancePalmares : mockStore.getPerformancePalmares()
  ).filter((p) => p.joueur_id === joueurId);
  const evolution =
    typeof window === "undefined" && resolveTennisDataMode() === "dataset"
      ? (loadLocalTennisDataset().evolution[joueurId] ?? [])
      : seed
        ? (seedPerformanceEvolution[joueurId] ?? [])
        : mockStore.getPerformanceEvolution(joueurId);
  const stats_surfaces =
    typeof window === "undefined" && resolveTennisDataMode() === "dataset"
      ? (loadLocalTennisDataset().surfaces[joueurId] ?? [])
      : seed
        ? (seedPerformanceSurfaces[joueurId] ?? [])
        : mockStore.getPerformanceSurfaces(joueurId);

  return {
    joueur,
    rankings,
    matchs_recents: matchs.sort((a, b) =>
      b.date_match.localeCompare(a.date_match)
    ),
    prochains_matchs: prochains,
    tournois,
    stats_surfaces,
    evolution,
    palmares,
  };
}

export async function getAllRankingsMarocains(): Promise<
  { joueur: Joueur; rankings: RankingSnapshot[] }[]
> {
  const joueurs = await getMoroccanTrackedJoueurs();
  const all = fromMock()
    ? getMockSeed().performanceRankings
    : mockStore.getPerformanceRankings();
  return joueurs.map((j) => ({
    joueur: j,
    rankings: all.filter((r) => r.joueur_id === j.id),
  }));
}

export async function getAllTournoisMarocains(): Promise<
  { joueur: Joueur; tournois: TournoiJoueur[] }[]
> {
  const joueurs = await getMoroccanTrackedJoueurs();
  const all = fromMock()
    ? getMockSeed().performanceTournois
    : mockStore.getPerformanceTournois();
  return joueurs.map((j) => ({
    joueur: j,
    tournois: all.filter((t) => t.joueur_id === j.id),
  }));
}

export async function getResultatsRecentsMarocains(): Promise<MatchPerformance[]> {
  const joueurs = await getMoroccanTrackedJoueurs();
  const ids = new Set(joueurs.map((j) => j.id));
  const all = fromMock()
    ? getMockSeed().performanceMatchs
    : mockStore.getPerformanceMatchs();
  return all
    .filter((m) => ids.has(m.joueur_id))
    .sort((a, b) => b.date_match.localeCompare(a.date_match));
}

export { getMoroccanTrackedJoueurs };
