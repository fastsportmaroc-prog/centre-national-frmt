import type { Joueur, JoueurFilters, JoueurWithGroupe } from "@/lib/types/database";
import { calculerAge } from "./joueur";

export function filterJoueurs(
  joueurs: JoueurWithGroupe[],
  filters: JoueurFilters
): JoueurWithGroupe[] {
  const q = filters.search?.trim().toLowerCase();

  return joueurs.filter((j) => {
    if (q) {
      const hay = `${j.prenom} ${j.nom} ${j.email ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (filters.sexe && j.sexe !== filters.sexe) return false;
    if (filters.categorie && j.categorie_age !== filters.categorie) return false;
    if (filters.groupeId && j.groupe_id !== filters.groupeId) return false;
    if (filters.niveau && j.niveau !== filters.niveau) return false;
    if (filters.statut && j.statut !== filters.statut) return false;

    const age = calculerAge(j.date_naissance);
    if (filters.ageMin != null && age < filters.ageMin) return false;
    if (filters.ageMax != null && age > filters.ageMax) return false;

    return true;
  });
}
