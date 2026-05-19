import type { Joueur } from "./database";

export type CircuitType =
  | "atp"
  | "wta"
  | "itf_pro"
  | "itf_junior"
  | "futures"
  | "challenger";

export type MatchResultat = "victoire" | "defaite" | "abandon" | "forfait";

/** Adversaire — données de match uniquement, pas de fiche joueur */
export type AdversaireMatch = {
  nom: string;
  pays: string;
  country_code: string;
  classement: string | null;
  external_id?: string | null;
};

export type MatchPerformance = {
  id: string;
  joueur_id: string;
  circuit: CircuitType;
  tournoi: string;
  ville: string | null;
  pays_tournoi: string | null;
  date_match: string;
  tour: string;
  surface: string;
  score: string;
  resultat: MatchResultat;
  adversaire: AdversaireMatch;
  points_gagnes: number | null;
};

export type RankingSnapshot = {
  id: string;
  joueur_id: string;
  circuit: CircuitType;
  rang: number;
  points: number;
  variation: number | null;
  date_classement: string;
};

export type TournoiJoueur = {
  id: string;
  joueur_id: string;
  circuit: CircuitType;
  nom: string;
  ville: string;
  pays: string;
  surface: string;
  date_debut: string;
  date_fin: string;
  statut: "a_venir" | "en_cours" | "termine";
  meilleur_tour: string | null;
  points: number | null;
};

export type ProchainMatch = {
  id: string;
  joueur_id: string;
  circuit: CircuitType;
  tournoi: string;
  date_prevue: string;
  tour: string;
  adversaire: AdversaireMatch;
  surface: string;
};

export type StatsSurface = {
  surface: string;
  matchs: number;
  victoires: number;
  defaites: number;
};

export type EvolutionClassement = {
  date: string;
  circuit: CircuitType;
  rang: number;
};

export type PalmaresEntry = {
  id: string;
  joueur_id: string;
  annee: number;
  tournoi: string;
  circuit: CircuitType;
  resultat: string;
};

export type PerformancesJoueur = {
  joueur: Joueur;
  rankings: RankingSnapshot[];
  matchs_recents: MatchPerformance[];
  prochains_matchs: ProchainMatch[];
  tournois: TournoiJoueur[];
  stats_surfaces: StatsSurface[];
  evolution: EvolutionClassement[];
  palmares: PalmaresEntry[];
};

export type PerformancesDashboard = {
  topAtpHommes: { joueur: Joueur; ranking: RankingSnapshot }[];
  topWtaFemmes: { joueur: Joueur; ranking: RankingSnapshot }[];
  topJuniorsItf: { joueur: Joueur; ranking: RankingSnapshot }[];
  resultatsRecents: MatchPerformance[];
  prochainsMatchs: ProchainMatch[];
  progressions: { joueur: Joueur; variation: number; circuit: CircuitType }[];
  palmaresMaroc: PalmaresEntry[];
  derniere_sync: string | null;
  provider: string;
};
