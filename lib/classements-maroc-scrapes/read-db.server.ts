import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { displayNameForCneJoueur } from "@/lib/classements-maroc-scrapes/display-name";
import {
  disciplineFromStoredSourceId,
  isSourcePlayerId,
  parsePlayerHistoryKey,
  playerKey,
  toStoredSourcePlayerId,
} from "@/lib/classements-maroc-scrapes/player-key";
import { createSupabaseAdminClient } from "@/lib/supabase/admin.server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type {
  ClassementMarocCategorie,
  ClassementMarocDiscipline,
  ClassementMarocEvolutionPlayer,
  ClassementMarocEvolutionResult,
  ClassementMarocHistoryPoint,
  ClassementMarocLoadResult,
  ClassementMarocScrapeRow,
  ClassementMarocType,
  ClassementMarocWithHistory,
} from "@/lib/types/classements-maroc-scrapes";

export type {
  ClassementMarocHistoryPoint,
  ClassementMarocWithHistory,
  ClassementMarocLoadResult,
  ClassementMarocEvolutionResult,
};

const SELECT_SNAPSHOT =
  "id, nom_joueur, type_classement, genre, rang, points, evolution, age, semaine_releve, date_releve, source_url, source_player_id, joueur_cne_id, est_membre_cne";

function fmtPremierReleveMessage(premier: string): string {
  try {
    const d = new Date(`${premier}T12:00:00`);
    const label = d.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    return `Pas de données disponibles avant le ${label}`;
  } catch {
    return `Pas de données disponibles avant le ${premier}`;
  }
}

async function getAdmin(): Promise<SupabaseClient | null> {
  if (!isSupabaseConfigured()) return null;
  return createSupabaseAdminClient();
}

/** Distinct semaines, plus récentes en premier. */
export async function listSemainesReleve(
  admin?: SupabaseClient | null
): Promise<string[]> {
  const client = admin ?? (await getAdmin());
  if (!client) return [];

  const { data, error } = await client
    .from("classements_maroc_scrapes")
    .select("semaine_releve")
    .order("semaine_releve", { ascending: false });

  if (error) return [];
  const set = new Set((data ?? []).map((r) => r.semaine_releve as string));
  return [...set];
}

/** Première semaine disponible en base (plus ancienne). */
export async function getPremierReleve(
  admin?: SupabaseClient | null
): Promise<string | null> {
  const client = admin ?? (await getAdmin());
  if (!client) return null;

  const { data, error } = await client
    .from("classements_maroc_scrapes")
    .select("semaine_releve")
    .order("semaine_releve", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return data.semaine_releve as string;
}

/**
 * Relevé le plus récent avec semaine_releve ≤ asOf (ISO YYYY-MM-DD).
 * Retourne null si aucune donnée avant/à cette date.
 */
export async function resolveSemaineAsOf(
  asOf: string,
  admin?: SupabaseClient | null
): Promise<string | null> {
  const client = admin ?? (await getAdmin());
  if (!client) return null;

  const { data, error } = await client
    .from("classements_maroc_scrapes")
    .select("semaine_releve")
    .lte("semaine_releve", asOf)
    .order("semaine_releve", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return data.semaine_releve as string;
}

async function enrichCneNames(
  admin: SupabaseClient,
  rows: ClassementMarocScrapeRow[]
): Promise<Map<string, string>> {
  const joueurIds = [
    ...new Set(rows.map((r) => r.joueur_cne_id).filter(Boolean)),
  ] as string[];
  const joueurNames = new Map<string, string>();
  if (!joueurIds.length) return joueurNames;

  const { data: joueurs } = await admin
    .from("joueurs")
    .select("id, prenom, nom")
    .in("id", joueurIds);
  for (const j of joueurs ?? []) {
    const name = displayNameForCneJoueur(j.prenom as string | null, j.nom as string | null);
    if (name) joueurNames.set(j.id as string, name);
  }
  return joueurNames;
}

/** Delta vs semaine précédente — une requête bornée sur les clés du snapshot courant. */
async function loadPrevWeekRanks(
  admin: SupabaseClient,
  semaineActive: string,
  rows: ClassementMarocScrapeRow[]
): Promise<Map<string, number>> {
  const semaines = await listSemainesReleve(admin);
  const idx = semaines.indexOf(semaineActive);
  const prevSemaine = idx >= 0 && idx < semaines.length - 1 ? semaines[idx + 1]! : null;
  const map = new Map<string, number>();
  if (!prevSemaine || !rows.length) return map;

  const sourceIds = rows.map((r) => r.source_player_id).filter(Boolean) as string[];
  const noms = rows.filter((r) => !r.source_player_id).map((r) => r.nom_joueur);

  if (sourceIds.length) {
    const { data } = await admin
      .from("classements_maroc_scrapes")
      .select("type_classement, source_player_id, nom_joueur, rang, source_url")
      .eq("semaine_releve", prevSemaine)
      .in("source_player_id", sourceIds);
    for (const h of data ?? []) {
      map.set(
        playerKey({
          type_classement: h.type_classement as ClassementMarocType,
          source_player_id: h.source_player_id as string | null,
          nom_joueur: h.nom_joueur as string,
          source_url: h.source_url as string | null,
        }),
        h.rang as number
      );
    }
  }

  if (noms.length) {
    const { data } = await admin
      .from("classements_maroc_scrapes")
      .select("type_classement, source_player_id, nom_joueur, rang, source_url")
      .eq("semaine_releve", prevSemaine)
      .in("nom_joueur", noms)
      .is("source_player_id", null);
    for (const h of data ?? []) {
      map.set(
        playerKey({
          type_classement: h.type_classement as ClassementMarocType,
          source_player_id: h.source_player_id as string | null,
          nom_joueur: h.nom_joueur as string,
          source_url: h.source_url as string | null,
        }),
        h.rang as number
      );
    }
  }

  return map;
}

export async function loadPlayerHistory(
  options: {
    type: ClassementMarocType;
    sourcePlayerId?: string | null;
    nomJoueur?: string;
    discipline?: ClassementMarocDiscipline;
    from?: string | null;
    to?: string | null;
  }
): Promise<ClassementMarocHistoryPoint[]> {
  const admin = await getAdmin();
  if (!admin) return [];

  const discipline = options.discipline ?? "simple";
  const storedId = options.sourcePlayerId
    ? toStoredSourcePlayerId(options.sourcePlayerId, discipline)
    : null;

  let query = admin
    .from("classements_maroc_scrapes")
    .select("semaine_releve, rang, points, evolution")
    .eq("type_classement", options.type)
    .order("semaine_releve", { ascending: true });

  if (storedId) {
    query = query.eq("source_player_id", storedId);
  } else if (options.nomJoueur) {
    query = query.eq("nom_joueur", options.nomJoueur);
    query =
      discipline === "double"
        ? query.like("source_url", "%doubles%")
        : query.not("source_url", "ilike", "%doubles%");
  } else {
    return [];
  }

  if (options.from) query = query.gte("semaine_releve", options.from);
  if (options.to) query = query.lte("semaine_releve", options.to);

  const { data, error } = await query;
  if (error) return [];
  return (data ?? []).map((h) => ({
    semaine_releve: h.semaine_releve as string,
    rang: h.rang as number,
    points: h.points as number | null,
    evolution: h.evolution as number | null,
  }));
}

export async function loadClassementsMarocScrapes(options?: {
  semaine?: string | null;
  asOf?: string | null;
  type?: ClassementMarocCategorie;
  discipline?: ClassementMarocDiscipline;
}): Promise<ClassementMarocLoadResult> {
  const empty = (extra?: Partial<ClassementMarocLoadResult>): ClassementMarocLoadResult => ({
    rows: [],
    semaines: [],
    semaine_active: null,
    premier_releve: null,
    as_of: options?.asOf ?? null,
    message_indisponible: null,
    ...extra,
  });

  if (!isSupabaseConfigured()) {
    return empty({ error: "Supabase non configuré" });
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return empty({ error: "SUPABASE_SERVICE_ROLE_KEY manquant" });
  }

  const semaines = await listSemainesReleve(admin);
  const premier_releve = semaines.length ? semaines[semaines.length - 1]! : null;
  const asOf = options?.asOf?.trim() || null;

  let semaineActive: string | null = null;
  let message_indisponible: string | null = null;

  if (asOf) {
    semaineActive = await resolveSemaineAsOf(asOf, admin);
    if (!semaineActive && premier_releve) {
      message_indisponible = fmtPremierReleveMessage(premier_releve);
      return {
        rows: [],
        semaines,
        semaine_active: null,
        premier_releve,
        as_of: asOf,
        message_indisponible,
      };
    }
  } else {
    semaineActive = options?.semaine ?? semaines[0] ?? null;
  }

  if (!semaineActive) {
    return {
      rows: [],
      semaines,
      semaine_active: null,
      premier_releve,
      as_of: asOf,
      message_indisponible: premier_releve
        ? null
        : "Aucun relevé en base. Lancez une mise à jour.",
    };
  }

  let query = admin
    .from("classements_maroc_scrapes")
    .select(SELECT_SNAPSHOT)
    .eq("semaine_releve", semaineActive)
    .order("rang", { ascending: true });

  const discipline = options?.discipline ?? "simple";
  if (discipline === "double") {
    query = query.like("source_player_id", "%#D");
  } else {
    query = query.or("source_player_id.is.null,source_player_id.not.like.%#D");
  }

  if (options?.type && options.type !== "all") {
    query = query.eq("type_classement", options.type);
  }

  const { data: current, error } = await query;
  if (error) {
    return {
      rows: [],
      semaines,
      semaine_active: semaineActive,
      premier_releve,
      as_of: asOf,
      message_indisponible: null,
      error: error.message,
    };
  }

  const currentRows = (current ?? []) as ClassementMarocScrapeRow[];
  const joueurNames = await enrichCneNames(admin, currentRows);
  const prevRanks = await loadPrevWeekRanks(admin, semaineActive, currentRows);

  const rows: ClassementMarocWithHistory[] = currentRows.map((row) => {
    const discipline = disciplineFromStoredSourceId(row.source_player_id, row.source_url);
    const key = playerKey({ ...row, discipline });
    const prevRang = prevRanks.get(key);
    const delta_rang_semaine = prevRang != null ? prevRang - row.rang : null;
    const enrichedName =
      row.joueur_cne_id && joueurNames.get(row.joueur_cne_id)
        ? joueurNames.get(row.joueur_cne_id)!
        : row.nom_joueur;
    return {
      ...row,
      discipline,
      nom_joueur: enrichedName,
      delta_rang_semaine,
      historique: [],
    };
  });

  return {
    rows,
    semaines,
    semaine_active: semaineActive,
    premier_releve,
    as_of: asOf,
    message_indisponible: null,
  };
}

export async function loadClassementsMarocEvolution(options: {
  keys: string[];
  from: string;
  to: string;
  metric?: "rang" | "points";
}): Promise<ClassementMarocEvolutionResult> {
  const metric = options.metric ?? "rang";
  const empty = (error?: string): ClassementMarocEvolutionResult => ({
    from: options.from,
    to: options.to,
    metric,
    players: [],
    premier_releve: null,
    error,
  });

  const admin = await getAdmin();
  if (!admin) return empty("Supabase non configuré");

  const premier_releve = await getPremierReleve(admin);
  const keys = options.keys.slice(0, 5);
  if (!keys.length) return { ...empty(), premier_releve };

  const players: ClassementMarocEvolutionPlayer[] = [];

  for (const key of keys) {
    const parsed = parsePlayerHistoryKey(key);
    if (!parsed) continue;
    const { type, discipline, idOrName } = parsed;

    const storedId = isSourcePlayerId(idOrName)
      ? toStoredSourcePlayerId(idOrName, discipline)
      : null;

    let query = admin
      .from("classements_maroc_scrapes")
      .select(
        "nom_joueur, type_classement, source_player_id, joueur_cne_id, est_membre_cne, semaine_releve, rang, points, evolution, source_url"
      )
      .eq("type_classement", type)
      .gte("semaine_releve", options.from)
      .lte("semaine_releve", options.to)
      .order("semaine_releve", { ascending: true });

    query = storedId
      ? query.eq("source_player_id", storedId)
      : query.eq("nom_joueur", idOrName);

    const { data, error } = await query;
    if (error || !data?.length) continue;

    const first = data[0]!;
    let nom = first.nom_joueur as string;
    const joueurCneId = (first.joueur_cne_id as string | null) ?? null;
    if (joueurCneId) {
      const { data: j } = await admin
        .from("joueurs")
        .select("prenom, nom")
        .eq("id", joueurCneId)
        .maybeSingle();
      if (j) {
        nom = displayNameForCneJoueur(j.prenom as string | null, j.nom as string | null) || nom;
      }
    }

    const rowForKey = {
      type_classement: type,
      discipline,
      source_player_id: (first.source_player_id as string | null) ?? null,
      nom_joueur: first.nom_joueur as string,
      source_url: (first.source_url as string | null) ?? null,
    };

    players.push({
      key: playerKey(rowForKey),
      nom_joueur: nom,
      type_classement: type,
      discipline: rowForKey.discipline,
      source_player_id: rowForKey.source_player_id,
      joueur_cne_id: joueurCneId,
      est_membre_cne: Boolean(first.est_membre_cne),
      series: data.map((h) => ({
        semaine_releve: h.semaine_releve as string,
        rang: h.rang as number,
        points: h.points as number | null,
        evolution: h.evolution as number | null,
      })),
    });
  }

  return {
    from: options.from,
    to: options.to,
    metric,
    players,
    premier_releve,
  };
}

/** Joueurs CNE du dernier relevé — pour sélecteurs du chart dashboard. */
export async function listCnePlayersForEvolution(options?: {
  discipline?: ClassementMarocDiscipline;
}): Promise<
  Array<{
    key: string;
    nom_joueur: string;
    type_classement: ClassementMarocType;
    discipline: ClassementMarocDiscipline;
    rang: number;
  }>
> {
  const admin = await getAdmin();
  if (!admin) return [];

  const discipline = options?.discipline ?? "simple";

  const semaines = await listSemainesReleve(admin);
  const latest = semaines[0];
  if (!latest) return [];

  let query = admin
    .from("classements_maroc_scrapes")
    .select(
      "nom_joueur, type_classement, source_player_id, joueur_cne_id, est_membre_cne, rang, source_url"
    )
    .eq("semaine_releve", latest)
    .eq("est_membre_cne", true)
    .order("rang", { ascending: true });

  query =
    discipline === "double"
      ? query.like("source_player_id", "%#D")
      : query.or("source_player_id.is.null,source_player_id.not.like.%#D");

  const { data } = await query;

  const rows = (data ?? []) as ClassementMarocScrapeRow[];
  const names = await enrichCneNames(admin, rows);

  return rows.map((r) => ({
    key: playerKey({
      ...r,
      discipline: disciplineFromStoredSourceId(r.source_player_id, r.source_url),
    }),
    nom_joueur:
      r.joueur_cne_id && names.get(r.joueur_cne_id)
        ? names.get(r.joueur_cne_id)!
        : r.nom_joueur,
    type_classement: r.type_classement,
    discipline: disciplineFromStoredSourceId(r.source_player_id, r.source_url),
    rang: r.rang,
  }));
}
