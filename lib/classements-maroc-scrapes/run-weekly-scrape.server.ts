import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { fetchAtpMoroccoRankings } from "@/lib/classements-maroc-scrapes/atp-html.parser";
import {
  attachCneMatches,
  type JoueurCneRow,
} from "@/lib/classements-maroc-scrapes/match-joueur-cne";
import { mondayOfWeek } from "@/lib/classements-maroc-scrapes/week";
import {
  publishCneRankingsFromMarocScrape,
  rematchMarocScrapeCneFlags,
} from "@/lib/classements-maroc-scrapes/publish-cne-rankings.server";
import { fetchWtaMoroccoRankings } from "@/lib/classements-maroc-scrapes/wta-api.client";
import { createSupabaseAdminClient } from "@/lib/supabase/admin.server";
import type { ClassementMarocScrapeInput } from "@/lib/types/classements-maroc-scrapes";

export type ScrapeMarocSummary = {
  ok: boolean;
  skipped: boolean;
  semaine_releve: string;
  atp: number;
  wta: number;
  total: number;
  messages: string[];
  error?: string;
};

async function loadJoueursCne(supabase: SupabaseClient): Promise<JoueurCneRow[]> {
  const { data, error } = await supabase
    .from("joueurs")
    .select("id, prenom, nom, sexe, categorie_age")
    .or("statut.is.null,statut.eq.actif");
  if (error) throw new Error(error.message);
  return (data ?? []) as JoueurCneRow[];
}

async function weekAlreadyScraped(
  supabase: SupabaseClient,
  semaine: string,
  type?: "ATP" | "WTA"
): Promise<boolean> {
  let query = supabase
    .from("classements_maroc_scrapes")
    .select("id", { count: "exact", head: true })
    .eq("semaine_releve", semaine);
  if (type) query = query.eq("type_classement", type);
  const { count, error } = await query;
  if (error) throw new Error(error.message);
  return (count ?? 0) > 0;
}

function toInsertRows(
  parsed: Array<
    Omit<ClassementMarocScrapeInput, "semaine_releve" | "type_classement" | "genre" | "discipline">
  >,
  type: "ATP" | "WTA",
  genre: "M" | "F",
  semaine: string,
  joueurs: JoueurCneRow[]
) {
  const withType = parsed.map((r) => ({
    ...r,
    type_classement: type,
    genre,
    semaine_releve: semaine,
  }));
  return attachCneMatches(withType, joueurs);
}

export async function runWeeklyMarocScrape(options?: {
  force?: boolean;
  semaine_releve?: string;
  /** ATP seulement. */
  atpOnly?: boolean;
  /** WTA seulement (historique via API `at=`). */
  wtaOnly?: boolean;
}): Promise<ScrapeMarocSummary> {
  const currentMonday = mondayOfWeek();
  const semaine = options?.semaine_releve ?? currentMonday;
  const atpOnly = Boolean(options?.atpOnly);
  const wtaOnly = Boolean(options?.wtaOnly);
  const messages: string[] = [];

  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    return {
      ok: false,
      skipped: false,
      semaine_releve: semaine,
      atp: 0,
      wta: 0,
      total: 0,
      messages,
      error: "SUPABASE_SERVICE_ROLE_KEY manquant",
    };
  }

  const needAtp = !wtaOnly;
  const needWta = !atpOnly;
  const hasAtp = needAtp ? await weekAlreadyScraped(supabase, semaine, "ATP") : true;
  const hasWta = needWta ? await weekAlreadyScraped(supabase, semaine, "WTA") : true;
  const fullyPresent = hasAtp && hasWta;

  if (!options?.force && fullyPresent) {
    await rematchMarocScrapeCneFlags(supabase);
    const publish = await publishCneRankingsFromMarocScrape(supabase);
    const publishMsg =
      publish.upserted > 0
        ? `${publish.upserted} classement(s) CNE publié(s) vers le tableau de bord`
        : "Aucun classement CNE à publier";
    if (publish.errors.length) {
      messages.push(...publish.errors.slice(0, 3));
    }
    return {
      ok: true,
      skipped: true,
      semaine_releve: semaine,
      atp: 0,
      wta: 0,
      total: publish.upserted,
      messages: [
        `Relevé déjà en base pour la semaine du ${semaine} — scrape ignoré`,
        publishMsg,
      ],
    };
  }

  try {
    const joueurs = await loadJoueursCne(supabase);
    const nowIso = new Date().toISOString();

    let atpRows: ReturnType<typeof toInsertRows> = [];
    let wtaRows: ReturnType<typeof toInsertRows> = [];

    if (needAtp && (options?.force || !hasAtp)) {
      const atpResult = await fetchAtpMoroccoRankings({ dateWeek: semaine });
      messages.push(`ATP : ${atpResult.rows.length} joueur(s) MAR (semaine ${semaine})`);
      atpRows = toInsertRows(atpResult.rows, "ATP", "M", semaine, joueurs).map((r) => ({
        ...r,
        date_releve: nowIso,
      }));
    } else if (needAtp) {
      messages.push(`ATP : déjà en base pour ${semaine}`);
    }

    if (needWta && (options?.force || !hasWta)) {
      const wtaResult = await fetchWtaMoroccoRankings({ at: semaine });
      const rankedNote = wtaResult.rankedAt ? ` rankedAt=${wtaResult.rankedAt}` : "";
      messages.push(
        `WTA : ${wtaResult.rows.length} joueur(s) MAR (${wtaResult.pagesFetched} page(s) API, at=${semaine}${rankedNote})`
      );
      // Stocker sous la semaine demandée (lundi ATP aligné) ; rankedAt peut coïncider.
      wtaRows = toInsertRows(wtaResult.rows, "WTA", "F", semaine, joueurs).map((r) => ({
        ...r,
        date_releve: nowIso,
      }));
    } else if (needWta) {
      messages.push(`WTA : déjà en base pour ${semaine}`);
    }

    const allRows = [...atpRows, ...wtaRows];
    if (!allRows.length) {
      return {
        ok: true,
        skipped: true,
        semaine_releve: semaine,
        atp: 0,
        wta: 0,
        total: 0,
        messages,
      };
    }

    if (options?.force) {
      if (needAtp && atpRows.length) {
        const { error: delAtp } = await supabase
          .from("classements_maroc_scrapes")
          .delete()
          .eq("semaine_releve", semaine)
          .eq("type_classement", "ATP");
        if (delAtp) {
          return {
            ok: false,
            skipped: false,
            semaine_releve: semaine,
            atp: 0,
            wta: 0,
            total: 0,
            messages,
            error: delAtp.message,
          };
        }
      }
      if (needWta && wtaRows.length) {
        const { error: delWta } = await supabase
          .from("classements_maroc_scrapes")
          .delete()
          .eq("semaine_releve", semaine)
          .eq("type_classement", "WTA");
        if (delWta) {
          return {
            ok: false,
            skipped: false,
            semaine_releve: semaine,
            atp: 0,
            wta: 0,
            total: 0,
            messages,
            error: delWta.message,
          };
        }
      }
    }

    const { error } = await supabase.from("classements_maroc_scrapes").insert(allRows);
    if (error) {
      return {
        ok: false,
        skipped: false,
        semaine_releve: semaine,
        atp: atpRows.length,
        wta: wtaRows.length,
        total: 0,
        messages,
        error: error.message,
      };
    }

    messages.push(
      `${allRows.length} ligne(s) insérées — historique semaine ${semaine} (ITF Junior : toujours via RapidAPI / classements_externes)`
    );

    await rematchMarocScrapeCneFlags(supabase);

    // Ne publie vers le dashboard que le relevé le plus récent (évite d’écraser avec un backfill).
    const publish = await publishCneRankingsFromMarocScrape(supabase);
    if (publish.cleaned > 0) {
      messages.push(`${publish.cleaned} junior(s) : classement ATP/WTA erroné retiré`);
    }
    if (publish.upserted > 0) {
      messages.push(
        `${publish.upserted} classement(s) CNE publié(s) — ${publish.joueursUpdated} fiche(s) joueur mises à jour`
      );
    }
    if (publish.errors.length) {
      messages.push(...publish.errors.slice(0, 3));
    }

    return {
      ok: true,
      skipped: false,
      semaine_releve: semaine,
      atp: atpRows.length,
      wta: wtaRows.length,
      total: allRows.length,
      messages,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      skipped: false,
      semaine_releve: semaine,
      atp: 0,
      wta: 0,
      total: 0,
      messages,
      error: msg,
    };
  }
}
