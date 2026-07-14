import { normalizeFilterIsoDate } from "@/lib/utils/french-date-input";
import type { ProgrammationFilters } from "@/lib/types/programmation-joueurs";

/** Fusionne un patch de filtres avec normalisation et ordre des dates. */
export function mergeProgrammationDateFilters(
  prev: ProgrammationFilters,
  patch: Partial<ProgrammationFilters>
): ProgrammationFilters {
  const next: ProgrammationFilters = { ...prev, ...patch };

  if ("dateDebut" in patch) {
    next.dateDebut = normalizeFilterIsoDate(patch.dateDebut);
  }
  if ("dateFin" in patch) {
    next.dateFin = normalizeFilterIsoDate(patch.dateFin);
  }

  const debut = next.dateDebut;
  const fin = next.dateFin;
  if (debut && fin && debut > fin) {
    if ("dateDebut" in patch && !("dateFin" in patch)) {
      next.dateFin = debut;
    } else if ("dateFin" in patch && !("dateDebut" in patch)) {
      next.dateDebut = fin;
    } else {
      next.dateDebut = fin;
      next.dateFin = debut;
    }
  }

  return next;
}
