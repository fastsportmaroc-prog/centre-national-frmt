import { normalizeCompetitionVisas } from "@/lib/competitions/visas-requis-fallback";
import type { Competition, CompetitionStatut } from "@/lib/types/competition";

export function computeCompetitionStatut(
  dateDebut: string,
  dateFin: string,
  statutDb?: string
): CompetitionStatut {
  if (statutDb === "annulee") return "annulee";
  const today = new Date().toISOString().slice(0, 10);
  if (today < dateDebut.slice(0, 10)) return "a_venir";
  if (today > dateFin.slice(0, 10)) return "terminee";
  return "en_cours";
}

export function statutCompetitionLabel(statut: CompetitionStatut): string {
  switch (statut) {
    case "a_venir":
      return "À venir";
    case "en_cours":
      return "En cours";
    case "terminee":
      return "Terminée";
    case "annulee":
      return "Annulée";
    default:
      return statut;
  }
}

export function statutCompetitionBadge(statut: CompetitionStatut): string {
  switch (statut) {
    case "a_venir":
      return "prevu";
    case "en_cours":
      return "en_cours";
    case "terminee":
      return "termine";
    case "annulee":
      return "annule";
    default:
      return "prevu";
  }
}

export function withComputedStatut(c: Competition): Competition & { statut_affichage: CompetitionStatut } {
  const normalized = normalizeCompetitionVisas(c);
  return {
    ...normalized,
    statut_affichage: computeCompetitionStatut(
      normalized.date_debut,
      normalized.date_fin,
      normalized.statut
    ),
  };
}

export function visasRequisLabel(visasRequis: boolean): string {
  return visasRequis ? "Visas requis" : "Sans visas";
}

export const BUDGET_CATEGORIES = [
  { value: "billets_avion", label: "Billets avion" },
  { value: "hebergement", label: "Hébergement" },
  { value: "restauration", label: "Restauration" },
  { value: "textiles", label: "Textiles" },
  { value: "frais_inscription", label: "Frais d'inscription" },
  { value: "divers", label: "Divers" },
] as const;
