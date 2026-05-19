import type {
  MatchPerformance,
  PalmaresEntry,
  ProchainMatch,
  RankingSnapshot,
  TournoiJoueur,
} from "@/lib/types/performances";
import type { Joueur } from "@/lib/types/database";

/** Fournisseur officiel (API) — pas de scraping ATP/WTA/ITF */
export type TennisDataProvider = {
  name: string;
  isConfigured: boolean;
  fetchMoroccanPlayers(): Promise<Joueur[]>;
  fetchRankings(joueurIds: string[]): Promise<RankingSnapshot[]>;
  fetchRecentMatches(joueurIds: string[]): Promise<MatchPerformance[]>;
  fetchUpcomingMatches(joueurIds: string[]): Promise<ProchainMatch[]>;
  fetchTournaments(joueurIds: string[]): Promise<TournoiJoueur[]>;
  fetchPalmares(joueurIds: string[]): Promise<PalmaresEntry[]>;
};
