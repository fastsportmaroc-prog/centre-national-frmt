import {
  MOROCCO_COUNTRY_CODE,
  MOROCCO_FEDERATION,
  MOROCCO_NATIONALITY,
  isMoroccanPlayer,
} from "@/lib/tennis/morocco-filter";
import type { Joueur, SexeJoueur } from "@/lib/types/database";
import type {
  AdversaireMatch,
  CircuitType,
  MatchPerformance,
  MatchResultat,
  ProchainMatch,
  RankingSnapshot,
} from "@/lib/types/performances";
import type { ApiFixture, ApiPlayerProfile, ApiStandingRow } from "./types";

export function joueurIdFromProvider(playerKey: string): string {
  return `tennis-${playerKey}`;
}

export function isMoroccoCountryLabel(country: string | null | undefined): boolean {
  if (!country) return false;
  const c = country.trim().toLowerCase();
  return c === "morocco" || c === "maroc" || c === "marocaine" || c === "marocain";
}

export function parsePlayerName(full: string): { prenom: string; nom: string } {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return { prenom: full.trim(), nom: "" };
  return { prenom: parts[0], nom: parts.slice(1).join(" ") };
}

function parseBirthday(bday?: string): string {
  if (!bday) return "2000-01-01";
  const m = bday.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return "2000-01-01";
}

function sexeFromCircuit(circuit: CircuitType): SexeJoueur {
  if (circuit === "wta") return "F";
  return "M";
}

export function circuitFromEventType(eventType: string): CircuitType {
  const t = eventType.toLowerCase();
  if (t.includes("wta")) return "wta";
  if (t.includes("challenger")) return "challenger";
  if (t.includes("itf") && t.includes("junior")) return "itf_junior";
  if (t.includes("itf")) return "itf_pro";
  if (t.includes("futures")) return "futures";
  if (t.includes("atp")) return "atp";
  return "itf_pro";
}

export function circuitFromLeague(league: string): CircuitType {
  const l = league.toUpperCase();
  if (l === "WTA") return "wta";
  if (l === "ATP") return "atp";
  return "atp";
}

function movementToVariation(movement: string): number | null {
  const m = movement.toLowerCase();
  if (m === "up") return 1;
  if (m === "down") return -1;
  return null;
}

function countryToCode(country: string): string {
  const map: Record<string, string> = {
    france: "FRA",
    spain: "ESP",
    espagne: "ESP",
    italy: "ITA",
    italie: "ITA",
    morocco: "MAR",
    maroc: "MAR",
    usa: "USA",
    "united states": "USA",
    romania: "ROU",
    roumanie: "ROU",
    brazil: "BRA",
    brésil: "BRA",
    bresil: "BRA",
  };
  return map[country.trim().toLowerCase()] ?? country.slice(0, 3).toUpperCase();
}

export function mapStandingToJoueur(row: ApiStandingRow): Joueur {
  const { prenom, nom } = parsePlayerName(row.player);
  const circuit = circuitFromLeague(row.league);
  const now = new Date().toISOString();
  const id = joueurIdFromProvider(row.player_key);

  return {
    id,
    photo_url: null,
    prenom,
    nom: nom || prenom,
    date_naissance: "2000-01-01",
    categorie_age: "Senior",
    sexe: sexeFromCircuit(circuit),
    nationalite: MOROCCO_NATIONALITY,
    country_code: MOROCCO_COUNTRY_CODE,
    federation: MOROCCO_FEDERATION,
    external_atp_id: circuit === "atp" || circuit === "challenger" ? row.player_key : null,
    external_wta_id: circuit === "wta" ? row.player_key : null,
    external_itf_id: null,
    external_itf_junior_id: null,
    external_tennis_provider_id: row.player_key,
    is_marocain: true,
    is_frmt_tracked: true,
    email: null,
    telephone: null,
    niveau: row.league,
    classement: `${row.league} #${row.place}`,
    groupe_id: null,
    coach_referent: "FRMT",
    statut: "actif",
    documents: null,
    notes: `Synchronisé api-tennis.com`,
    created_at: now,
  };
}

export function enrichJoueurFromProfile(
  joueur: Joueur,
  profile: ApiPlayerProfile
): Joueur {
  const { prenom, nom } = parsePlayerName(profile.player_name);
  return {
    ...joueur,
    prenom: nom ? prenom : joueur.prenom,
    nom: nom || profile.player_name,
    date_naissance: parseBirthday(profile.player_bday),
    photo_url: profile.player_logo ?? joueur.photo_url,
    nationalite: isMoroccoCountryLabel(profile.player_country)
      ? MOROCCO_NATIONALITY
      : joueur.nationalite,
    country_code: isMoroccoCountryLabel(profile.player_country)
      ? MOROCCO_COUNTRY_CODE
      : joueur.country_code,
    is_marocain: isMoroccanPlayer({
      nationalite: profile.player_country,
      country_code: MOROCCO_COUNTRY_CODE,
    }),
  };
}

export function mapStandingToRanking(
  row: ApiStandingRow,
  joueurId: string
): RankingSnapshot {
  const circuit = circuitFromLeague(row.league);
  return {
    id: `rk-${row.player_key}-${row.league}`,
    joueur_id: joueurId,
    circuit,
    rang: parseInt(row.place, 10) || 999,
    points: parseInt(row.points, 10) || 0,
    variation: movementToVariation(row.movement),
    date_classement: new Date().toISOString().slice(0, 10),
  };
}

function mapAdversaire(
  name: string,
  countryGuess: string,
  classement: string | null
): AdversaireMatch {
  return {
    nom: name,
    pays: countryGuess,
    country_code: countryToCode(countryGuess),
    classement,
  };
}

function matchResult(
  fixture: ApiFixture,
  moroccanKey: string
): MatchResultat {
  if (fixture.event_status !== "Finished") return "abandon";
  if (!fixture.event_winner) return "abandon";
  const isFirst = moroccanKey === fixture.first_player_key;
  const won =
    (fixture.event_winner === "First Player" && isFirst) ||
    (fixture.event_winner === "Second Player" && !isFirst);
  return won ? "victoire" : "defaite";
}

export function mapFixtureToMatch(
  fixture: ApiFixture,
  moroccanPlayerKey: string,
  joueurId: string
): MatchPerformance | ProchainMatch | null {
  const isFirst = moroccanPlayerKey === fixture.first_player_key;
  const isSecond = moroccanPlayerKey === fixture.second_player_key;
  if (!isFirst && !isSecond) return null;

  const adversaireNom = isFirst ? fixture.event_second_player : fixture.event_first_player;
  const adversaireKey = isFirst ? fixture.second_player_key : fixture.first_player_key;
  const circuit = circuitFromEventType(fixture.event_type_type);
  const today = new Date().toISOString().slice(0, 10);
  const finished =
    fixture.event_status === "Finished" && fixture.event_final_result !== "-";

  const adversaire = mapAdversaire(adversaireNom, "—", null);

  if (!finished && fixture.event_date >= today) {
    return {
      id: `pm-${fixture.event_key}`,
      joueur_id: joueurId,
      circuit,
      tournoi: fixture.tournament_name,
      date_prevue: fixture.event_date,
      tour: fixture.tournament_round || "—",
      adversaire: { ...adversaire, external_id: adversaireKey },
      surface: "Terre battue",
    } satisfies ProchainMatch;
  }

  if (!finished) return null;

  return {
    id: `m-${fixture.event_key}`,
    joueur_id: joueurId,
    circuit,
    tournoi: fixture.tournament_name,
    ville: null,
    pays_tournoi: null,
    date_match: fixture.event_date,
    tour: fixture.tournament_round || "—",
    surface: "Terre battue",
    score: fixture.event_final_result,
    resultat: matchResult(fixture, moroccanPlayerKey),
    adversaire: { ...adversaire, external_id: adversaireKey },
    points_gagnes: null,
  } satisfies MatchPerformance;
}

export function isMatchPerformance(
  row: MatchPerformance | ProchainMatch
): row is MatchPerformance {
  return "resultat" in row;
}
