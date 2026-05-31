import type { BudgetMembreExtraType } from "@/lib/types/budget-previsionnel";
import type { CompetitionParticipantType } from "@/lib/types/competition";

export const BUDGET_MEMBRE_EXTRA_TYPES: {
  value: BudgetMembreExtraType;
  label: string;
}[] = [
  { value: "kine", label: "Kinésithérapeute" },
  { value: "federal", label: "Membre fédéral" },
  { value: "autre", label: "Autre" },
];

/** Rubrique « Autres membres » — kiné et fédéraux uniquement */
export const BUDGET_AUTRES_MEMBRES_TYPES = BUDGET_MEMBRE_EXTRA_TYPES.filter((t) =>
  (["kine", "federal"] as const).includes(t.value as "kine" | "federal")
);

export function budgetMembreExtraLabel(type: BudgetMembreExtraType): string {
  return BUDGET_MEMBRE_EXTRA_TYPES.find((t) => t.value === type)?.label ?? type;
}

export function budgetMembreExtraDisplayName(m: {
  prenom?: string;
  nom?: string;
}): string {
  return [m.prenom?.trim(), m.nom?.trim()].filter(Boolean).join(" ");
}

/** Libellé badge / liste : type seul, ou type + nom si renseigné. */
export function budgetMembreExtraBadgeLabel(m: {
  type: BudgetMembreExtraType;
  prenom?: string;
  nom?: string;
}): string {
  const name = budgetMembreExtraDisplayName(m);
  const typeLabel = budgetMembreExtraLabel(m.type);
  if (!name) return typeLabel;
  return `${typeLabel} · ${name}`;
}

export const COMPETITION_STAFF_PARTICIPANT_TYPES: CompetitionParticipantType[] = [
  "kine",
  "federal",
  "autre",
];

export function competitionParticipantTypeLabel(type: CompetitionParticipantType): string {
  switch (type) {
    case "joueur":
      return "Joueur";
    case "coach":
      return "Coach";
    case "kine":
      return "Kinésithérapeute";
    case "federal":
      return "Membre fédéral";
    case "autre":
      return "Autre";
    default:
      return type;
  }
}

export function isCompetitionStaffParticipantType(
  type: CompetitionParticipantType
): boolean {
  return COMPETITION_STAFF_PARTICIPANT_TYPES.includes(type);
}
