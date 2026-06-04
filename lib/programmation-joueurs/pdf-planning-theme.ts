import type { ProgrammationType } from "@/lib/types/programmation-joueurs";
import {
  PROGRAMMATION_TYPE_COLORS,
  PROGRAMMATION_TYPE_LABELS,
} from "@/lib/constants/programmation-joueurs";

export const PROGRAMMATION_TYPE_SHORT: Record<ProgrammationType, string> = {
  tournoi_itf: "ITF",
  tournoi_atp_wta: "ATP/WTA",
  coupe_davis: "COUPE DAVIS",
  bjk_cup: "BJK CUP",
  stage_national: "STAGE CN",
  stage_etranger: "STAGE",
  competition_nationale: "SELECTION",
  blessure: "BLESSURE",
  repos: "REPOS",
  autre: "AUTRE",
};

export function typeColorRgb(type: ProgrammationType): [number, number, number] {
  const hex = PROGRAMMATION_TYPE_COLORS[type].bg;
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

export function typeBorderRgb(type: ProgrammationType): [number, number, number] {
  const hex = PROGRAMMATION_TYPE_COLORS[type].border;
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

export const PDF_PLANNING_THEME = {
  heroDark: [15, 23, 42] as [number, number, number],
  heroMid: [30, 41, 59] as [number, number, number],
  accentRed: [201, 31, 46] as [number, number, number],
  accentGreen: [0, 107, 63] as [number, number, number],
  gridLine: [226, 232, 240] as [number, number, number],
  colAlt: [248, 250, 252] as [number, number, number],
  colBase: [255, 255, 255] as [number, number, number],
  axisBg: [30, 58, 95] as [number, number, number],
  muted: [100, 116, 139] as [number, number, number],
  textDark: [15, 23, 42] as [number, number, number],
  kpiBlue: [37, 99, 235] as [number, number, number],
  kpiGreen: [22, 101, 52] as [number, number, number],
  kpiOrange: [194, 65, 12] as [number, number, number],
  kpiPurple: [109, 40, 217] as [number, number, number],
};

export const LEGEND_TYPES: ProgrammationType[] = [
  "stage_national",
  "tournoi_itf",
  "tournoi_atp_wta",
  "coupe_davis",
  "competition_nationale",
  "repos",
  "blessure",
];

export function legendLabel(type: ProgrammationType): string {
  return PROGRAMMATION_TYPE_LABELS[type];
}
