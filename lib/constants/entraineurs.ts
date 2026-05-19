import type { StatutEntraineur, StatutMissionEntraineur, TypeMissionEntraineur } from "@/lib/types/entraineurs";

export const STATUTS_ENTRAINEUR: { value: StatutEntraineur; label: string }[] = [
  { value: "actif", label: "Actif" },
  { value: "en_mission", label: "En mission" },
  { value: "inactif", label: "Inactif" },
];

export const TYPES_MISSION: { value: TypeMissionEntraineur; label: string }[] = [
  { value: "stage", label: "Stage" },
  { value: "tournoi", label: "Tournoi" },
  { value: "mission", label: "Mission" },
  { value: "formation", label: "Formation" },
];

export const STATUTS_MISSION: { value: StatutMissionEntraineur; label: string }[] = [
  { value: "planifie", label: "Planifié" },
  { value: "en_cours", label: "En cours" },
  { value: "termine", label: "Terminé" },
  { value: "annule", label: "Annulé" },
];

/** Libellé court pour matching joueur.coach_referent */
export function coachReferentLabel(prenom: string, nom: string): string {
  return `${prenom[0]}. ${nom}`;
}
