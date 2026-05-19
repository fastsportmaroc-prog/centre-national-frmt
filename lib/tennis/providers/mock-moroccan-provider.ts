import type { TennisDataProvider } from "./types";
import { getMockSeed } from "@/lib/data/mock/store";
import { canImportAsPlayerProfile } from "@/lib/tennis/morocco-filter";

export const mockMoroccanProvider: TennisDataProvider = {
  name: "Mock FRMT (données marocaines)",
  isConfigured: true,

  async fetchMoroccanPlayers() {
    return getMockSeed().joueurs.filter((j) => canImportAsPlayerProfile(j));
  },

  async fetchRankings(joueurIds) {
    const all = getMockSeed().performanceRankings;
    return joueurIds.length
      ? all.filter((r) => joueurIds.includes(r.joueur_id))
      : all;
  },

  async fetchRecentMatches(joueurIds) {
    const all = getMockSeed().performanceMatchs;
    return joueurIds.length
      ? all.filter((m) => joueurIds.includes(m.joueur_id))
      : all;
  },

  async fetchUpcomingMatches(joueurIds) {
    const all = getMockSeed().performanceProchains;
    return joueurIds.length
      ? all.filter((m) => joueurIds.includes(m.joueur_id))
      : all;
  },

  async fetchTournaments(joueurIds) {
    const all = getMockSeed().performanceTournois;
    return joueurIds.length
      ? all.filter((t) => joueurIds.includes(t.joueur_id))
      : all;
  },

  async fetchPalmares(joueurIds) {
    const all = getMockSeed().performancePalmares;
    return joueurIds.length
      ? all.filter((p) => joueurIds.includes(p.joueur_id))
      : all;
  },
};
