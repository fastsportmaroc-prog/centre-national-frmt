import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getJoueurDisplayCategorie, matchesJoueurCategoryFilter } from "@/lib/utils/joueur";

type JoueurCategorieRow = {
  id: string;
  categorie_age: string | null;
  date_naissance: string | null;
};

/**
 * Résout les IDs joueurs correspondant à un filtre catégorie.
 *
 * IMPORTANT : la table `joueurs` n'a PAS de colonne `categorie`, seulement
 * `categorie_age` (+ déduction possible via `date_naissance`). On applique donc
 * la même logique que le front (`matchesJoueurCategoryFilter`) au lieu d'un
 * `ilike("categorie", ...)` qui provoquait une erreur SQL silencieuse
 * (« column joueurs.categorie does not exist ») et donc un résultat vide.
 */
export async function resolveJoueurIdsForCategorie(
  supabase: SupabaseClient,
  categorie: string
): Promise<string[]> {
  const term = categorie.trim();
  if (!term) return [];

  const { data, error } = await supabase
    .from("joueurs")
    .select("id, categorie_age, date_naissance");
  if (error || !data) return [];

  return (data as JoueurCategorieRow[])
    .filter((j) => matchesJoueurCategoryFilter(j, term))
    .map((j) => j.id);
}

/** Map id → catégorie affichée (pour filtrage permissions côté serveur). */
export async function buildJoueurCategorieMap(
  supabase: SupabaseClient
): Promise<Map<string, string>> {
  const { data, error } = await supabase
    .from("joueurs")
    .select("id, categorie_age, date_naissance");
  if (error || !data) return new Map();

  return new Map(
    (data as JoueurCategorieRow[]).map((j) => [j.id, getJoueurDisplayCategorie(j)])
  );
}
