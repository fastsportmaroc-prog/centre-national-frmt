import type { ProgrammationType } from "@/lib/types/programmation-joueurs";
import {
  PROGRAMMATION_TYPE_COLORS,
  PROGRAMMATION_TYPE_LABELS,
} from "@/lib/constants/programmation-joueurs";

export const PROGRAMMATION_TYPE_SHORT: Record<ProgrammationType, string> = {
  tournoi_itf: "ITF",
  tournoi_atp_wta: "ATP/WTA",
  coupe_davis: "Davis",
  bjk_cup: "BJK",
  stage_national: "Stage CN",
  stage_etranger: "Stage",
  competition_nationale: "Sélect.",
  blessure: "Blessure",
  repos: "Repos",
  autre: "Autre",
};

export function typeColorRgb(type: ProgrammationType): [number, number, number] {
  const hex = PROGRAMMATION_TYPE_COLORS[type].bg;
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

export function typeTextRgb(type: ProgrammationType): [number, number, number] {
  const hex = PROGRAMMATION_TYPE_COLORS[type].text;
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

export const PDF_CALENDAR_THEME = {
  headerBg: [0, 51, 102] as [number, number, number], // bleu FFT
  headerAccent: [201, 31, 46] as [number, number, number], // rouge FRMT
  headerSub: [0, 107, 63] as [number, number, number], // vert FRMT
  weekdayBg: [30, 58, 95] as [number, number, number],
  weekendBg: [241, 245, 249] as [number, number, number],
  cellBg: [255, 255, 255] as [number, number, number],
  cellBorder: [203, 213, 225] as [number, number, number],
  todayRing: [201, 31, 46] as [number, number, number],
  muted: [100, 116, 139] as [number, number, number],
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
