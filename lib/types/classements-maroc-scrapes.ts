export type ClassementMarocType = "ATP" | "WTA";

/** Tableau : simple (singles) ou double — scrapes actuels = simple. */
export type ClassementMarocDiscipline = "simple" | "double";

export type ClassementMarocScrapeRow = {
  id: string;
  nom_joueur: string;
  type_classement: ClassementMarocType;
  /** Présent après migration 064 ; défaut logique = simple. */
  discipline?: ClassementMarocDiscipline;
  genre: "M" | "F";
  rang: number;
  points: number | null;
  evolution: number | null;
  age: number | null;
  semaine_releve: string;
  date_releve: string;
  source_url: string;
  source_player_id: string | null;
  joueur_cne_id: string | null;
  est_membre_cne: boolean;
};

export type ClassementMarocScrapeInput = Omit<
  ClassementMarocScrapeRow,
  "id" | "date_releve" | "joueur_cne_id" | "est_membre_cne" | "discipline"
> & {
  joueur_cne_id?: string | null;
  est_membre_cne?: boolean;
  discipline?: ClassementMarocDiscipline;
};

export type ClassementMarocCategorie = "all" | ClassementMarocType;

export type ClassementMarocHistoryPoint = {
  semaine_releve: string;
  rang: number;
  points: number | null;
  evolution: number | null;
};

export type ClassementMarocWithHistory = ClassementMarocScrapeRow & {
  delta_rang_semaine: number | null;
  /** Rempli à la demande (expand) — vide par défaut pour perf. */
  historique: ClassementMarocHistoryPoint[];
};

export type ClassementMarocLoadResult = {
  rows: ClassementMarocWithHistory[];
  semaines: string[];
  semaine_active: string | null;
  premier_releve: string | null;
  as_of: string | null;
  message_indisponible: string | null;
  error?: string;
};

export type ClassementMarocEvolutionPlayer = {
  key: string;
  nom_joueur: string;
  type_classement: ClassementMarocType;
  discipline: ClassementMarocDiscipline;
  source_player_id: string | null;
  joueur_cne_id: string | null;
  est_membre_cne: boolean;
  series: ClassementMarocHistoryPoint[];
};

export type ClassementMarocEvolutionResult = {
  from: string;
  to: string;
  metric: "rang" | "points";
  players: ClassementMarocEvolutionPlayer[];
  premier_releve: string | null;
  error?: string;
};
