import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  computeRankEvolution,
  readPreviousRang,
  updateJoueurClassementField,
} from "@/lib/classements-externes/evolution.server";
import type { ClassementExterneCible } from "@/lib/classements-externes/sync-eligibility";

export type RankingHit = { rang: number; points: number | null; apiPlayerId?: string | null };

export async function upsertClassementExterne(
  supabase: SupabaseClient,
  input: {
    joueur_id: string;
    nom_joueur: string;
    categorie: ClassementExterneCible | string;
    hit: RankingHit;
    date_maj: string;
    source: string;
    updateJoueurField?: boolean;
  }
) {
  const previousRang = await readPreviousRang(supabase, input.joueur_id, input.categorie);
  const { evolution, rang_precedent } = computeRankEvolution(previousRang, input.hit.rang);

  const { error } = await supabase.from("classements_externes").upsert(
    {
      joueur_id: input.joueur_id,
      nom_joueur: input.nom_joueur,
      categorie: input.categorie,
      rang: input.hit.rang,
      points: input.hit.points,
      date_maj: input.date_maj,
      source: input.source,
      evolution,
      rang_precedent,
    },
    { onConflict: "joueur_id,categorie" }
  );

  if (!error && input.updateJoueurField !== false) {
    await updateJoueurClassementField(
      supabase,
      input.joueur_id,
      input.categorie,
      input.hit.rang
    );
  }

  return { error, evolution, rang_precedent };
}
