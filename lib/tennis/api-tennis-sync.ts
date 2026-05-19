import { canImportAsPlayerProfile } from "@/lib/tennis/morocco-filter";
import type { Joueur } from "@/lib/types/database";
import type {
  MatchPerformance,
  PalmaresEntry,
  ProchainMatch,
  RankingSnapshot,
  TournoiJoueur,
} from "@/lib/types/performances";
import { apiTennisRequest, isApiTennisConfigured } from "./providers/api-tennis/client";
import {
  circuitFromEventType,
  enrichJoueurFromProfile,
  isMatchPerformance,
  isMoroccoCountryLabel,
  joueurIdFromProvider,
  mapFixtureToMatch,
  mapStandingToJoueur,
  mapStandingToRanking,
} from "./providers/api-tennis/mappers";
import type {
  ApiFixture,
  ApiPlayerProfile,
  ApiStandingRow,
} from "./providers/api-tennis/types";

export type ApiTennisSyncPayload = {
  provider: string;
  synced_at: string;
  joueurs: Joueur[];
  matchs: MatchPerformance[];
  rankings: RankingSnapshot[];
  prochains: ProchainMatch[];
  tournois: TournoiJoueur[];
  palmares: PalmaresEntry[];
};

function dateRange(daysBack: number, daysForward: number) {
  const start = new Date();
  start.setDate(start.getDate() - daysBack);
  const end = new Date();
  end.setDate(end.getDate() + daysForward);
  return {
    date_start: start.toISOString().slice(0, 10),
    date_stop: end.toISOString().slice(0, 10),
  };
}

async function fetchStandingsMorocco(): Promise<ApiStandingRow[]> {
  const leagues = ["ATP", "WTA"] as const;
  const byKey = new Map<string, ApiStandingRow>();

  for (const event_type of leagues) {
    const rows = await apiTennisRequest<ApiStandingRow[]>("get_standings", {
      event_type,
    });
    for (const row of rows ?? []) {
      if (isMoroccoCountryLabel(row.country)) {
        byKey.set(row.player_key, row);
      }
    }
  }

  return [...byKey.values()];
}

async function fetchPlayerProfile(playerKey: string): Promise<ApiPlayerProfile | null> {
  const rows = await apiTennisRequest<ApiPlayerProfile[]>("get_players", {
    player_key: playerKey,
  });
  return rows?.[0] ?? null;
}

async function fetchFixturesForPlayer(playerKey: string): Promise<ApiFixture[]> {
  const { date_start, date_stop } = dateRange(120, 45);
  const rows = await apiTennisRequest<ApiFixture[]>("get_fixtures", {
    date_start,
    date_stop,
    player_key: playerKey,
  });
  return rows ?? [];
}

/** Synchronisation serveur via api-tennis.com (clé TENNIS_DATA_API_KEY) */
export async function syncFromApiTennis(): Promise<ApiTennisSyncPayload> {
  if (!isApiTennisConfigured()) {
    throw new Error("TENNIS_DATA_API_KEY manquante");
  }

  const standings = await fetchStandingsMorocco();
  const joueursMap = new Map<string, Joueur>();

  for (const row of standings) {
    let joueur = mapStandingToJoueur(row);
    try {
      const profile = await fetchPlayerProfile(row.player_key);
      if (profile && isMoroccoCountryLabel(profile.player_country)) {
        joueur = enrichJoueurFromProfile(joueur, profile);
      }
    } catch {
      /* profil optionnel */
    }
    if (canImportAsPlayerProfile(joueur)) {
      joueursMap.set(row.player_key, joueur);
    }
  }

  const extraKeys = process.env.TENNIS_MOROCCO_PLAYER_KEYS?.split(",").map((k) => k.trim()).filter(Boolean);
  for (const key of extraKeys ?? []) {
    if (joueursMap.has(key)) continue;
    try {
      const profile = await fetchPlayerProfile(key);
      if (profile && isMoroccoCountryLabel(profile.player_country)) {
        const base = mapStandingToJoueur({
          place: "—",
          player: profile.player_name,
          player_key: profile.player_key,
          league: "ATP",
          movement: "same",
          country: profile.player_country,
          points: "0",
        });
        joueursMap.set(key, enrichJoueurFromProfile(base, profile));
      }
    } catch {
      /* ignore */
    }
  }

  const joueurs = [...joueursMap.values()];
  const rankings: RankingSnapshot[] = standings
    .filter((r) => joueursMap.has(r.player_key))
    .map((r) => mapStandingToRanking(r, joueurIdFromProvider(r.player_key)));

  const matchs: MatchPerformance[] = [];
  const prochains: ProchainMatch[] = [];
  const tournois: TournoiJoueur[] = [];

  for (const joueur of joueurs) {
    const playerKey = joueur.external_tennis_provider_id!;
    let fixtures: ApiFixture[] = [];
    try {
      fixtures = await fetchFixturesForPlayer(playerKey);
    } catch {
      continue;
    }

    const byTournament = new Map<string, ApiFixture>();

    for (const fixture of fixtures) {
      const mapped = mapFixtureToMatch(fixture, playerKey, joueur.id);
      if (mapped) {
        if (isMatchPerformance(mapped)) matchs.push(mapped);
        else prochains.push(mapped);
      }
      if (!byTournament.has(fixture.tournament_key)) {
        byTournament.set(fixture.tournament_key, fixture);
      }
    }

    for (const f of byTournament.values()) {
      const circuit = circuitFromEventType(f.event_type_type);
      const finished = f.event_status === "Finished";
      tournois.push({
        id: `t-${f.tournament_key}-${joueur.id}`,
        joueur_id: joueur.id,
        circuit,
        nom: f.tournament_name,
        ville: "",
        pays: "",
        surface: "Terre battue",
        date_debut: f.event_date,
        date_fin: f.event_date,
        statut: finished ? "termine" : "a_venir",
        meilleur_tour: f.tournament_round || null,
        points: null,
      });
    }
  }

  matchs.sort((a, b) => b.date_match.localeCompare(a.date_match));

  return {
    provider: "api-tennis.com (données réelles)",
    synced_at: new Date().toISOString(),
    joueurs,
    matchs,
    rankings,
    prochains,
    tournois,
    palmares: [],
  };
}
