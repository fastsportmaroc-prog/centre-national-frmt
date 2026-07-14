import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { ClassementExterneCible } from "@/lib/classements-externes/sync-eligibility";

/** Positif = progression (le rang a baissé). */
export function computeRankEvolution(
  previousRang: number | null | undefined,
  newRang: number
): { evolution: number | null; rang_precedent: number | null } {
  if (previousRang == null || previousRang <= 0) {
    return { evolution: null, rang_precedent: null };
  }
  return {
    rang_precedent: previousRang,
    evolution: previousRang - newRang,
  };
}

export async function readPreviousRang(
  supabase: SupabaseClient,
  joueurId: string,
  categorie: ClassementExterneCible | string
): Promise<number | null> {
  const { data } = await supabase
    .from("classements_externes")
    .select("rang")
    .eq("joueur_id", joueurId)
    .eq("categorie", categorie)
    .maybeSingle();
  const rang = data?.rang;
  return typeof rang === "number" && rang > 0 ? rang : null;
}

export function classementLabelForJoueur(
  categorie: ClassementExterneCible | string,
  rang: number
): string {
  if (categorie === "ITF Junior") return `ITF J #${rang}`;
  return `${categorie} #${rang}`;
}

export async function updateJoueurClassementField(
  supabase: SupabaseClient,
  joueurId: string,
  categorie: ClassementExterneCible | string,
  rang: number
): Promise<void> {
  const label = classementLabelForJoueur(categorie, rang);
  const patch =
    categorie === "ITF Junior"
      ? { classement_itf: label }
      : { classement: label };
  await supabase.from("joueurs").update(patch).eq("id", joueurId);
}
