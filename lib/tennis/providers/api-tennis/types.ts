export type ApiTennisResponse<T> = {
  success: number;
  result: T;
  error?: string;
};

export type ApiStandingRow = {
  place: string;
  player: string;
  player_key: string;
  league: string;
  movement: string;
  country: string;
  points: string;
};

export type ApiPlayerProfile = {
  player_key: string;
  player_name: string;
  player_country: string;
  player_bday?: string;
  player_logo?: string | null;
  stats?: Array<{
    season: string;
    type: string;
    rank: string;
  }>;
};

export type ApiFixture = {
  event_key: string;
  event_date: string;
  event_time?: string;
  event_first_player: string;
  first_player_key: string;
  event_second_player: string;
  second_player_key: string;
  event_final_result: string;
  event_winner: string | null;
  event_status: string;
  event_type_type: string;
  tournament_name: string;
  tournament_key: string;
  tournament_round: string;
  tournament_season?: string;
};
