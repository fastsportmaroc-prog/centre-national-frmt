import type {
  ProgrammationEvenementEnriched,
  ProgrammationStatut,
} from "@/lib/types/programmation-joueurs";
import { isStageProgrammeVirtualEvent } from "@/lib/programmation-joueurs/planning-cne-stages";

/** Palette planning CNE (format Excel de référence). */
export type PlanningCneColorKey =
  | "tournoi"
  | "tournoi_itf"
  | "stage"
  | "deplacement"
  | "alerte"
  | "repos"
  | "equipe"
  | "medical"
  | "universite"
  /** @deprecated Alias historique — même palette que `stage`. */
  | "cne";

export type PlanningCneStageVariant = "prevu" | "realise" | "en_cours";

export type PlanningCneCellStyle = {
  colorKey: PlanningCneColorKey;
  bg: string;
  text: string;
  borderColor: string;
  borderStyle: "solid" | "dashed" | "none";
  italic: boolean;
  badge?: string;
  subtitle?: string;
  label: string;
  fullLabel: string;
  stageVariant?: PlanningCneStageVariant | null;
};

export const PLANNING_CNE_COLORS: Record<
  Exclude<PlanningCneColorKey, "cne">,
  { bg: string; text: string; border: string; label: string }
> = {
  tournoi: { bg: "#F9A825", text: "#1a1a1a", border: "#F57F17", label: "Tournois / Compétitions" },
  tournoi_itf: { bg: "#FFD700", text: "#1a1a1a", border: "#E6C200", label: "Tournois M25 / M15 / ITF" },
  stage: { bg: "#1565C0", text: "#FFFFFF", border: "#0D47A1", label: "Stage CNE réalisé" },
  deplacement: { bg: "#E65100", text: "#FFFFFF", border: "#BF360C", label: "Déplacement / Voyage" },
  alerte: { bg: "transparent", text: "#FF1744", border: "#FF1744", label: "Note / Alerte" },
  repos: { bg: "#263238", text: "#B0BEC5", border: "#37474F", label: "Repos" },
  equipe: { bg: "#2E7D32", text: "#FFFFFF", border: "#1B5E20", label: "Coupe Davis / BJK Cup" },
  medical: { bg: "#6A1B9A", text: "#FFFFFF", border: "#4A148C", label: "Rehab / Soins" },
  universite: { bg: "#37474F", text: "#FFFFFF", border: "#263238", label: "Université" },
};

/** Entrées légende stage (variantes visuelles). */
export const PLANNING_CNE_STAGE_LEGEND = [
  {
    label: "Stage CNE réalisé",
    bg: "#1565C0",
    text: "#FFFFFF",
    border: "#1565C0",
    borderStyle: "solid" as const,
  },
  {
    label: "Stage CNE prévu (bordure pointillée)",
    bg: "#1565C0",
    text: "#FFFFFF",
    border: "#FFFFFF",
    borderStyle: "dashed" as const,
  },
  {
    label: "Stage CNE en cours",
    bg: "#1976D2",
    text: "#FFFFFF",
    border: "#1976D2",
    borderStyle: "solid" as const,
    badge: "EN COURS",
  },
] as const;

export const PLANNING_CNE_HEADER = {
  joueur: { bg: "#1a472a", text: "#FFFFFF" },
  coach: { bg: "#1e3a5f", text: "#FFFFFF" },
  date: { bg: "#FFD700", text: "#1a1a1a" },
};

function isDeplacementEvent(ev: ProgrammationEvenementEnriched): boolean {
  if (ev.type === "stage_etranger") return true;
  const n = ev.nom.toLowerCase();
  return /d[eé]placement|voyage|travel/.test(n);
}

function isStageCneEvent(ev: ProgrammationEvenementEnriched): boolean {
  if (isStageProgrammeVirtualEvent(ev)) return ev.type === "stage_national";
  return ev.type === "stage_national";
}

function isItfTierNom(nom: string): boolean {
  const n = nom.toUpperCase();
  return (
    /\b(M25|M15|ITF|FUTURES|CHALLENGER?s?|W\d{2,3}|WTA\s*\d+)\b/.test(n) ||
    /^M\d{2}\b/.test(n.trim())
  );
}

function isUniversiteNom(nom: string): boolean {
  return /universit/i.test(nom);
}

function stageVariant(statut: ProgrammationStatut): PlanningCneStageVariant {
  if (statut === "en_cours") return "en_cours";
  if (statut === "a_venir") return "prevu";
  return "realise";
}

function truncateLabel(text: string, max = 20): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

export function eventCellFullLabel(ev: ProgrammationEvenementEnriched): string {
  if (ev.notes_coach?.trim().startsWith("!") || ev.notes_coach?.trim().startsWith("ALERTE")) {
    return (ev.notes_coach ?? ev.nom).trim();
  }

  if (isStageCneEvent(ev)) {
    const lieu = ev.ville?.trim();
    if (lieu) return `STAGE - ${lieu.toUpperCase()}`;
    if (ev.type === "stage_national") return "STAGE CNE";
    const nom = ev.nom.trim();
    if (nom) return nom.toUpperCase().startsWith("STAGE") ? nom : `STAGE - ${nom}`;
    return "STAGE CNE";
  }

  const parts = [ev.nom];
  if (ev.ville) parts.push(ev.ville.toUpperCase());
  return parts.filter(Boolean).join(" ").trim();
}

/** @deprecated Utiliser `eventCellFullLabel` + `cellStyleForEvent`. */
export function eventCellLabel(ev: ProgrammationEvenementEnriched): string {
  return truncateLabel(eventCellFullLabel(ev));
}

export function colorKeyForEvent(ev: ProgrammationEvenementEnriched): PlanningCneColorKey {
  if (ev.notes_coach?.trim().startsWith("!") || ev.notes_coach?.trim().startsWith("ALERTE")) {
    return "alerte";
  }
  switch (ev.type) {
    case "tournoi_itf":
      return "tournoi_itf";
    case "tournoi_atp_wta":
    case "competition_nationale":
      return isItfTierNom(ev.nom) ? "tournoi_itf" : "tournoi";
    case "stage_national":
      return "stage";
    case "stage_etranger":
      return "deplacement";
    case "coupe_davis":
    case "bjk_cup":
      return "equipe";
    case "blessure":
      return "medical";
    case "repos":
      return "repos";
    case "autre":
      if (isDeplacementEvent(ev)) return "deplacement";
      return isUniversiteNom(ev.nom) ? "universite" : "stage";
    default:
      if (isDeplacementEvent(ev)) return "deplacement";
      if (isUniversiteNom(ev.nom)) return "universite";
      if (isItfTierNom(ev.nom)) return "tournoi_itf";
      return "stage";
  }
}

function resolvePaletteKey(key: PlanningCneColorKey): Exclude<PlanningCneColorKey, "cne"> {
  return key === "cne" ? "stage" : key;
}

export function getPlanningCnePalette(key: PlanningCneColorKey) {
  return PLANNING_CNE_COLORS[resolvePaletteKey(key)];
}

export function cellStyleForEvent(ev: ProgrammationEvenementEnriched): PlanningCneCellStyle {
  const colorKey = colorKeyForEvent(ev);
  const paletteKey = resolvePaletteKey(colorKey);
  const base = PLANNING_CNE_COLORS[paletteKey];
  const fullLabel = eventCellFullLabel(ev);
  const label = truncateLabel(fullLabel);

  if (colorKey === "alerte") {
    return {
      colorKey,
      bg: "transparent",
      text: "#FF1744",
      borderColor: "#FF1744",
      borderStyle: "solid",
      italic: true,
      label,
      fullLabel,
    };
  }

  if (paletteKey === "stage" && isStageCneEvent(ev)) {
    const variant = stageVariant(ev.statut);
    if (variant === "en_cours") {
      return {
        colorKey: "stage",
        bg: "#1976D2",
        text: "#FFFFFF",
        borderColor: "#1976D2",
        borderStyle: "solid",
        italic: false,
        badge: "EN COURS",
        label,
        fullLabel,
        stageVariant: variant,
      };
    }
    if (variant === "prevu") {
      return {
        colorKey: "stage",
        bg: "#1565C0",
        text: "#FFFFFF",
        borderColor: "#FFFFFF",
        borderStyle: "dashed",
        italic: false,
        subtitle: "(PRÉVU)",
        label,
        fullLabel,
        stageVariant: variant,
      };
    }
    return {
      colorKey: "stage",
      bg: "#1565C0",
      text: "#FFFFFF",
      borderColor: "#1565C0",
      borderStyle: "solid",
      italic: false,
      label,
      fullLabel,
      stageVariant: "realise",
    };
  }

  return {
    colorKey: paletteKey,
    bg: base.bg,
    text: base.text,
    borderColor: base.border,
    borderStyle: "none",
    italic: false,
    label,
    fullLabel,
  };
}
