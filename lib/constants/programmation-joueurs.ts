import type { ProgrammationType } from "@/lib/types/programmation-joueurs";

export const PROGRAMMATION_TYPE_LABELS: Record<ProgrammationType, string> = {
  tournoi_itf: "Tournoi ITF",
  tournoi_atp_wta: "Tournoi ATP / WTA",
  coupe_davis: "Coupe Davis",
  bjk_cup: "BJK Cup",
  stage_national: "Stage Centre National",
  stage_etranger: "Stage à l'étranger",
  competition_nationale: "Compétition nationale",
  blessure: "Blessure",
  repos: "Repos",
  autre: "Autre",
};

/** Couleurs timeline (dark theme + PDF). */
export const PROGRAMMATION_TYPE_COLORS: Record<
  ProgrammationType,
  { bg: string; border: string; text: string }
> = {
  stage_national: { bg: "#276749", border: "#38A169", text: "#C6F6D5" },
  stage_etranger: { bg: "#2F855A", border: "#48BB78", text: "#C6F6D5" },
  tournoi_itf: { bg: "#2B6CB0", border: "#4299E1", text: "#BEE3F8" },
  tournoi_atp_wta: { bg: "#C05621", border: "#ED8936", text: "#FEEBC8" },
  coupe_davis: { bg: "#553C9A", border: "#805AD5", text: "#E9D8FD" },
  bjk_cup: { bg: "#6B46C1", border: "#9F7AEA", text: "#E9D8FD" },
  competition_nationale: { bg: "#C53030", border: "#FC8181", text: "#FED7D7" },
  repos: { bg: "#4A5568", border: "#718096", text: "#E2E8F0" },
  blessure: { bg: "#742A2A", border: "#E53E3E", text: "#FED7D7" },
  autre: { bg: "#2D3748", border: "#A0AEC0", text: "#EDF2F7" },
};

export const PROGRAMMATION_SURFACE_LABELS: Record<string, string> = {
  dur: "Dur",
  terre_battue: "Terre battue",
  gazon: "Gazon",
  indoor: "Indoor",
  synthetique: "Synthétique",
};

export const PROGRAMMATION_TYPE_OPTIONS = Object.entries(PROGRAMMATION_TYPE_LABELS).map(
  ([value, label]) => ({ value: value as ProgrammationType, label })
);

export const TOURNOI_TYPES: ProgrammationType[] = [
  "tournoi_itf",
  "tournoi_atp_wta",
  "coupe_davis",
  "bjk_cup",
];
