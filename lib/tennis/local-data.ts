import { canImportAsPlayerProfile } from "@/lib/tennis/morocco-filter";
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

import manifest from "@/data/tennis/manifest.json";
import joueursJson from "@/data/tennis/joueurs-marocains.json";
import rankingsJson from "@/data/tennis/rankings.json";
import matchsJson from "@/data/tennis/matchs.json";
import prochainsJson from "@/data/tennis/prochains-matchs.json";
import tournoisJson from "@/data/tennis/tournois.json";
import palmaresJson from "@/data/tennis/palmares.json";
import evolutionJson from "@/data/tennis/evolution.json";
import surfacesJson from "@/data/tennis/surfaces.json";

export type TennisLocalDataset = {
  manifest: typeof manifest;
  joueurs: Joueur[];
  rankings: RankingSnapshot[];
  matchs: MatchPerformance[];
  prochains: ProchainMatch[];
  tournois: TournoiJoueur[];
  palmares: PalmaresEntry[];
  evolution: Record<string, EvolutionClassement[]>;
  surfaces: Record<string, StatsSurface[]>;
};

let cached: TennisLocalDataset | null = null;

function withTimestamps(joueurs: Omit<Joueur, "created_at">[]): Joueur[] {
  const ts = new Date().toISOString();
  return joueurs.map((j) => ({
    ...j,
    created_at: ts,
    is_marocain: true,
    is_frmt_tracked: true,
  }));
}

/** Charge le dataset gratuit /data/tennis (filtré MAR) */
export function loadLocalTennisDataset(): TennisLocalDataset {
  if (cached) return cached;

  const joueurs = withTimestamps(joueursJson as Omit<Joueur, "created_at">[]).filter(
    (j) => canImportAsPlayerProfile(j) && j.is_frmt_tracked
  );

  const ids = new Set(joueurs.map((j) => j.id));

  cached = {
    manifest,
    joueurs,
    rankings: (rankingsJson as RankingSnapshot[]).filter((r) => ids.has(r.joueur_id)),
    matchs: (matchsJson as MatchPerformance[]).filter((m) => ids.has(m.joueur_id)),
    prochains: (prochainsJson as ProchainMatch[]).filter((m) => ids.has(m.joueur_id)),
    tournois: (tournoisJson as TournoiJoueur[]).filter((t) => ids.has(t.joueur_id)),
    palmares: (palmaresJson as PalmaresEntry[]).filter((p) => ids.has(p.joueur_id)),
    evolution: evolutionJson as Record<string, EvolutionClassement[]>,
    surfaces: surfacesJson as Record<string, StatsSurface[]>,
  };

  return cached;
}

export function getLocalDatasetManifest() {
  return manifest;
}
