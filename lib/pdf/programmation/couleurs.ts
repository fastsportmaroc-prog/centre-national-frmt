import type { ProgrammationType } from "@/lib/types/programmation-joueurs";

export const PDF_PRO = {
  headerBg: [10, 22, 40] as [number, number, number], // #0A1628
  headerLine1: [204, 41, 54] as [number, number, number],
  headerLine2: [0, 107, 63] as [number, number, number],
  tableHead: [28, 42, 58] as [number, number, number], // #1C2A3A
  planningCol: [10, 22, 40] as [number, number, number],
  rowAlt: [247, 249, 252] as [number, number, number], // #F7F9FC
  rowBase: [255, 255, 255] as [number, number, number],
  labelBg: [240, 244, 248] as [number, number, number], // #F0F4F8
  emptyCell: [250, 250, 250] as [number, number, number],
  border: [222, 228, 236] as [number, number, number],
  borderLight: [208, 215, 224] as [number, number, number],
  textDark: [28, 42, 58] as [number, number, number],
  textBody: [51, 51, 51] as [number, number, number],
  textMuted: [107, 114, 128] as [number, number, number],
  legendBg: [248, 249, 250] as [number, number, number],
  totalRow: [232, 237, 245] as [number, number, number],
  kpiTournois: [30, 111, 217] as [number, number, number],
  kpiStages: [26, 122, 60] as [number, number, number],
  kpiSemaines: [196, 92, 26] as [number, number, number],
  kpiPays: [123, 47, 168] as [number, number, number],
  kpiPoints: [37, 99, 235] as [number, number, number],
  statutAvenir: [30, 111, 217] as [number, number, number],
  statutEnCours: [26, 122, 60] as [number, number, number],
  statutTermine: [107, 114, 128] as [number, number, number],
};

/** Couleurs officielles spec PDF par type d'événement. */
export const TYPE_PDF_RGB: Record<ProgrammationType, [number, number, number]> = {
  stage_national: [26, 122, 60],
  stage_etranger: [34, 139, 74],
  tournoi_itf: [30, 111, 217],
  tournoi_atp_wta: [196, 92, 26],
  coupe_davis: [123, 47, 168],
  bjk_cup: [109, 40, 217],
  competition_nationale: [204, 41, 54],
  repos: [107, 114, 128],
  blessure: [139, 26, 26],
  autre: [75, 85, 99],
};

export const LEGEND_ORDER: ProgrammationType[] = [
  "stage_national",
  "tournoi_itf",
  "tournoi_atp_wta",
  "coupe_davis",
  "competition_nationale",
  "repos",
  "blessure",
];
