export type StatistiquesTab =
  | "stages"
  | "competitions"
  | "comparatif"
  | "financier"
  | "joueurs";

export type SaisonOption = "2025-2026" | "2024-2025" | "2023-2024";

import {
  OFFICIAL_AGE_CODES,
  officialCategoryFilterOptions,
} from "@/lib/constants/official-categories";

export type CategorieFilter = "Toutes" | (typeof OFFICIAL_AGE_CODES)[number] | string;

export type SexeFilter = "tous" | "M" | "F";

export type StatistiquesFilters = {
  tab: StatistiquesTab;
  saison: SaisonOption;
  categorie: CategorieFilter;
  start_date: string;
  end_date: string;
  stage_id: string;
  coach_id: string;
  sexe: SexeFilter;
};

export type StatsKpi = {
  label: string;
  value: string | number;
  sub?: string;
  trend?: string;
  progress?: number;
};

export type StagePresenceBar = {
  stageId: string;
  label: string;
  presence: number;
  fill: string;
};

export type ParticipantsEvolutionPoint = {
  month: string;
  U8: number;
  U10: number;
  U12: number;
  U14: number;
  U16: number;
  U18: number;
  "Elite Pro": number;
};

export type CategorieSlice = { name: string; value: number; fill: string };

export type TerrainOccupationBar = {
  terrain: string;
  heures: number;
  capacite: number;
  seances: number;
};

export type KineStackBar = {
  stage: string;
  Musculaire: number;
  Articulaire: number;
  Préventif: number;
  Autre: number;
  joueurs: number;
};

export type HeatmapCell = { week: number; day: number; value: number };

export type StageDetailRow = {
  id: string;
  stage: string;
  dates: string;
  duree: number;
  joueurs: number;
  coachs: number;
  presence: number;
  kine: number;
  cout: number;
};

export type MedalRow = {
  competition: string;
  or: number;
  argent: number;
  bronze: number;
  total: number;
  rang: string;
  categorie: string;
};

export type TopJoueurMedailles = {
  joueur: string;
  or: number;
  argent: number;
  bronze: number;
};

export type CompetitionBudgetStack = {
  competition: string;
  transport: number;
  hebergement: number;
  perDiem: number;
  inscription: number;
  equipement: number;
  divers: number;
  alloue: number;
};

export type CompetitionScatterPoint = {
  nom: string;
  cout: number;
  medailles: number;
  participants: number;
  type: "nationale" | "internationale";
};

export type CompetitionTableRow = {
  id: string;
  competition: string;
  type: string;
  dates: string;
  lieu: string;
  joueurs: number;
  medailles: string;
  budgetAlloue: number;
  budgetReel: number;
  ecart: number;
  statut: string;
};

export type RadarProfilePoint = {
  subject: string;
  stages: number;
  competitions: number;
};

export type TimelineBlock = {
  id: string;
  kind: "stage" | "competition";
  label: string;
  start: string;
  end: string;
  participants: number;
  stat: string;
};

export type BudgetMensuelBar = {
  month: string;
  stages: number;
  competitions: number;
  cumul: number;
};

export type BudgetPosteBar = {
  poste: string;
  prevu: number;
  reel: number;
};

export type DepenseSlice = { name: string; value: number; fill: string };

export type DepenseMensuelleLine = {
  month: string;
  stages: number;
  competitions: number;
  total: number;
};

export type DepassementRow = {
  poste: string;
  budget: number;
  reel: number;
  ecart: number;
  pct: number;
  justification: string;
};

export type JoueurStatsRow = {
  id: string;
  rang: number;
  joueur: string;
  categorie: string;
  club: string;
  nbStages: number;
  joursPresence: number;
  presencePct: number;
  medailles: number;
  classement: string;
};

export type PresencePerformancePoint = {
  joueur: string;
  presence: number;
  classement: number;
  categorie: string;
  competitions: number;
};

export type ClubBar = { club: string; count: number };

export type StagesStatsData = {
  kpis: StatsKpi[];
  presenceByStage: StagePresenceBar[];
  participantsEvolution: ParticipantsEvolutionPoint[];
  repartitionCategorie: CategorieSlice[];
  terrainsOccupation: TerrainOccupationBar[];
  kineByStage: KineStackBar[];
  heatmap: HeatmapCell[];
  stageTable: StageDetailRow[];
};

export type CompetitionsStatsData = {
  kpis: StatsKpi[];
  medalTable: MedalRow[];
  topMedailles: TopJoueurMedailles[];
  budgetStacks: CompetitionBudgetStack[];
  scatter: CompetitionScatterPoint[];
  table: CompetitionTableRow[];
};

export type ComparatifStatsData = {
  stagesKpis: StatsKpi[];
  competitionsKpis: StatsKpi[];
  radar: RadarProfilePoint[];
  timeline: TimelineBlock[];
  budgetMensuel: BudgetMensuelBar[];
};

export type FinancierStatsData = {
  kpis: StatsKpi[];
  budgetPostes: BudgetPosteBar[];
  repartition: DepenseSlice[];
  evolution: DepenseMensuelleLine[];
  depassements: DepassementRow[];
};

export type JoueursStatsData = {
  kpis: StatsKpi[];
  classement: JoueurStatsRow[];
  topPresence: { joueur: string; jours: number }[];
  presencePerformance: PresencePerformancePoint[];
  parClub: ClubBar[];
  progressionClassement: Record<string, { label: string; value: number }[]>;
  parRegion: { label: string; presence: number }[];
};

export type StatistiquesBundle = {
  stages: StagesStatsData;
  competitions: CompetitionsStatsData;
  comparatif: ComparatifStatsData;
  financier: FinancierStatsData;
  joueurs: JoueursStatsData;
};
