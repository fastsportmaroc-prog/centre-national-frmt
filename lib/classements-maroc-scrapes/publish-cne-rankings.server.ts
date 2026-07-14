import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  computeRankEvolution,
  readPreviousRang,
} from "@/lib/classements-externes/evolution.server";
import { ELITE_PRO_CODE, OFFICIAL_UN_CODES } from "@/lib/constants/official-categories";
import { displayNameForCneJoueur } from "@/lib/classements-maroc-scrapes/display-name";
import {
  attachCneMatches,
  type JoueurCneRow,
} from "@/lib/classements-maroc-scrapes/match-joueur-cne";
import type { ClassementMarocType } from "@/lib/types/classements-maroc-scrapes";

const SOURCE = "atp-wta-scrape-maroc";

type MarocCneRow = {
  joueur_cne_id: string;
  nom_joueur: string;
  type_classement: ClassementMarocType;
  rang: number;
  points: number | null;
  date_releve: string;
};

type JoueurMeta = {
  id: string;
  prenom: string | null;
  nom: string | null;
  categorie_age: string | null;
};

export type PublishCneRankingsSummary = {
  upserted: number;
  joueursUpdated: number;
  cleaned: number;
  errors: string[];
};

function isElitePro(categorieAge: string | null | undefined): boolean {
  return (categorieAge ?? "").trim() === ELITE_PRO_CODE;
}

async function loadLatestSemaine(supabase: SupabaseClient): Promise<string | null> {
  const { data, error } = await supabase
    .from("classements_maroc_scrapes")
    .select("semaine_releve")
    .order("semaine_releve", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data?.semaine_releve as string | undefined) ?? null;
}

/** Retire les classements ATP/WTA erronés des juniors (ex. homonymes Jamji). */
export async function cleanupJuniorAtpWtaRankings(
  supabase: SupabaseClient
): Promise<number> {
  const { data: juniors } = await supabase
    .from("joueurs")
    .select("id, categorie_age, classement")
    .in("categorie_age", [...OFFICIAL_UN_CODES]);

  let cleaned = 0;
  for (const j of juniors ?? []) {
    const id = j.id as string;
    await supabase
      .from("classements_externes")
      .delete()
      .eq("joueur_id", id)
      .in("categorie", ["ATP", "WTA"]);

    const classement = (j.classement as string | null) ?? "";
    if (/^(ATP|WTA)\s*#/i.test(classement)) {
      await supabase.from("joueurs").update({ classement: null }).eq("id", id);
      cleaned++;
    }
  }
  return cleaned;
}

export async function publishCneRankingsFromMarocScrape(
  supabase: SupabaseClient,
  semaine?: string | null
): Promise<PublishCneRankingsSummary> {
  const cleaned = await cleanupJuniorAtpWtaRankings(supabase);
  const semaineActive = semaine ?? (await loadLatestSemaine(supabase));
  if (!semaineActive) {
    return { upserted: 0, joueursUpdated: 0, cleaned, errors: [] };
  }

  const { data: rows, error } = await supabase
    .from("classements_maroc_scrapes")
    .select(
      "joueur_cne_id, nom_joueur, type_classement, rang, points, date_releve, est_membre_cne"
    )
    .eq("semaine_releve", semaineActive)
    .eq("est_membre_cne", true)
    .not("joueur_cne_id", "is", null);

  if (error) throw new Error(error.message);

  const cneRows: MarocCneRow[] = [];
  for (const r of rows ?? []) {
    if (!r.joueur_cne_id) continue;
    cneRows.push({
      joueur_cne_id: r.joueur_cne_id as string,
      nom_joueur: r.nom_joueur as string,
      type_classement: r.type_classement as ClassementMarocType,
      rang: r.rang as number,
      points: (r.points as number | null) ?? null,
      date_releve: r.date_releve as string,
    });
  }

  if (!cneRows.length) {
    return { upserted: 0, joueursUpdated: 0, cleaned, errors: [] };
  }

  const joueurIds = [...new Set(cneRows.map((r) => r.joueur_cne_id))];
  const { data: joueurs, error: joueursError } = await supabase
    .from("joueurs")
    .select("id, prenom, nom, categorie_age")
    .in("id", joueurIds);
  if (joueursError) throw new Error(joueursError.message);

  const joueurById = new Map(
    (joueurs ?? []).map((j) => [j.id as string, j as JoueurMeta])
  );

  const errors: string[] = [];
  let upserted = 0;
  let joueursUpdated = 0;

  for (const row of cneRows) {
    const joueur = joueurById.get(row.joueur_cne_id);
    if (!joueur || !isElitePro(joueur.categorie_age)) continue;

    const nom_joueur = displayNameForCneJoueur(joueur.prenom, joueur.nom) || row.nom_joueur;
    const previousRang = await readPreviousRang(supabase, row.joueur_cne_id, row.type_classement);
    const { evolution, rang_precedent } = computeRankEvolution(previousRang, row.rang);

    const { error: upsertError } = await supabase.from("classements_externes").upsert(
      {
        joueur_id: row.joueur_cne_id,
        nom_joueur,
        categorie: row.type_classement,
        rang: row.rang,
        points: row.points,
        date_maj: row.date_releve,
        source: SOURCE,
        evolution,
        rang_precedent,
      },
      { onConflict: "joueur_id,categorie" }
    );

    if (upsertError) {
      errors.push(`${nom_joueur}: ${upsertError.message}`);
      continue;
    }
    upserted++;

    const { error: updateError } = await supabase
      .from("joueurs")
      .update({ classement: `${row.type_classement} #${row.rang}` })
      .eq("id", row.joueur_cne_id);
    if (updateError) {
      errors.push(`joueur ${nom_joueur}: ${updateError.message}`);
    } else {
      joueursUpdated++;
    }
  }

  return { upserted, joueursUpdated, cleaned, errors };
}

/**
 * Recalcule joueur_cne_id / est_membre_cne sur tout l'historique marocain
 * (ex. joueuse ajoutée Elite Pro après le scrape — Synchro doit la rattacher).
 */
export async function rematchMarocScrapeCneFlags(supabase: SupabaseClient): Promise<number> {
  const { data: joueurs, error: joueursError } = await supabase
    .from("joueurs")
    .select("id, prenom, nom, sexe, categorie_age")
    .or("statut.is.null,statut.eq.actif");
  if (joueursError) throw new Error(joueursError.message);

  const { data: rows, error } = await supabase
    .from("classements_maroc_scrapes")
    .select("id, nom_joueur, type_classement, source_player_id, joueur_cne_id, est_membre_cne");
  if (error) throw new Error(error.message);
  if (!rows?.length) return 0;

  const matched = attachCneMatches(
    rows.map((r) => ({
      nom_joueur: r.nom_joueur as string,
      type_classement: r.type_classement as "ATP" | "WTA",
      source_player_id: (r.source_player_id as string | null) ?? null,
    })),
    (joueurs ?? []) as JoueurCneRow[]
  );

  let updated = 0;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!;
    const next = matched[i]!;
    const sameId = (row.joueur_cne_id as string | null) === next.joueur_cne_id;
    const sameFlag = Boolean(row.est_membre_cne) === next.est_membre_cne;
    const sameName = (row.nom_joueur as string) === next.nom_joueur;
    if (sameId && sameFlag && sameName) continue;

    const { error: updErr } = await supabase
      .from("classements_maroc_scrapes")
      .update({
        joueur_cne_id: next.joueur_cne_id,
        est_membre_cne: next.est_membre_cne,
        nom_joueur: next.nom_joueur,
      })
      .eq("id", row.id);
    if (updErr) throw new Error(updErr.message);
    updated++;
  }

  return updated;
}
