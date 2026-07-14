import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@/lib/supabase/admin.server";
import {
  extractRankingRows,
  extractSearchPlayers,
  findJoueurInRankingCache,
  pickSearchMatch,
  searchTermsForJoueur,
} from "@/lib/classements-externes/rapidapi-ranking-parse";
import {
  groupeParCible,
  type ClassementExterneCible,
  type JoueurSyncRow,
  SYNC_JOUEURS_SELECT,
} from "@/lib/classements-externes/sync-eligibility";
import { upsertClassementExterne } from "@/lib/classements-externes/upsert-classement.server";
import {
  CACHE_KEYS,
  extractAndCacheProfile,
  loadRankingCaches,
  loadSyncQueue,
  profileToHit,
  saveProfileCache,
  saveRankingSnapshot,
  saveSyncQueue,
  type CachedProfile,
  type RankingCacheMaps,
} from "@/lib/classements-externes/ranking-cache.server";

export type SyncMode = "cache" | "rankings" | "api";

export type CategorieSyncStats = {
  traites: number;
  synchronises: number;
  introuvables: number;
  ignores: number;
  erreurs: number;
};

export type SyncClassementsSummary = {
  ok: boolean;
  mode: SyncMode;
  traites: number;
  lignes_traitees: number;
  synchronises: number;
  ignores: number;
  introuvables: number;
  erreurs: number;
  en_attente_quota: number;
  itf_junior_endpoint: string;
  api_calls_used?: number;
  via: "edge-function" | "server-fallback" | "cache-only";
  par_categorie: Record<ClassementExterneCible, CategorieSyncStats>;
  details: Array<{
    joueur_id: string;
    nom: string;
    categorie_age?: string | null;
    categorie: string | null;
    status: string;
    message?: string;
  }>;
  messages: string[];
  error?: string;
  last_sync_at?: string;
};

const SOURCE = "rapidapi-tennisapi1-sofascore";
const SOURCE_CACHE = "rapidapi-cache-local";
const API_TIMEOUT_MS = 12_000;
const MAX_API_CALLS = 50;
const PREFERRED_COUNTRY = "MA";
const ITF_ENDPOINT_CANDIDATES = [
  "/api/tennis/rankings/itf",
  "/tennis/v2/itf/ranking/singles",
];

type Tour = "atp" | "wta";
type RankingHit = { rang: number; points: number | null; apiPlayerId?: string | null };

function emptyCategorieStats(): Record<ClassementExterneCible, CategorieSyncStats> {
  return {
    ATP: { traites: 0, synchronises: 0, introuvables: 0, ignores: 0, erreurs: 0 },
    WTA: { traites: 0, synchronises: 0, introuvables: 0, ignores: 0, erreurs: 0 },
    "ITF Junior": { traites: 0, synchronises: 0, introuvables: 0, ignores: 0, erreurs: 0 },
  };
}

function baseSummary(mode: SyncMode): SyncClassementsSummary {
  return {
    ok: true,
    mode,
    traites: 0,
    lignes_traitees: 0,
    synchronises: 0,
    ignores: 0,
    introuvables: 0,
    erreurs: 0,
    en_attente_quota: 0,
    itf_junior_endpoint: "non testé",
    via: mode === "cache" ? "cache-only" : "server-fallback",
    par_categorie: emptyCategorieStats(),
    details: [],
    messages: [],
  };
}

function playerDisplayName(j: JoueurSyncRow) {
  return `${j.prenom ?? ""} ${j.nom ?? ""}`.replace(/\s+/g, " ").trim();
}

function cleanJoueur(j: JoueurSyncRow): JoueurSyncRow {
  return {
    ...j,
    nom: (j.nom ?? "").replace(/\s+/g, " ").trim(),
    prenom: (j.prenom ?? "").replace(/\s+/g, " ").trim(),
    categorie_age: (j.categorie_age ?? "").trim() || null,
  };
}

class ApiBudget {
  used = 0;
  quotaHit = false;
  constructor(private readonly max: number) {}
  canSpend(n = 1) {
    return !this.quotaHit && this.used + n <= this.max;
  }
  markQuota() {
    this.quotaHit = true;
  }
}

class RapidApiClient {
  readonly budget: ApiBudget;
  constructor(
    private readonly key: string,
    private readonly host: string,
    budget: ApiBudget
  ) {
    this.budget = budget;
  }

  async get(path: string, query: Record<string, string> = {}) {
    if (!this.budget.canSpend()) return null;
    const url = new URL(`https://${this.host}${path}`);
    for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
    try {
      this.budget.used += 1;
      const res = await fetch(url.toString(), {
        headers: { "x-rapidapi-key": this.key, "x-rapidapi-host": this.host },
        signal: controller.signal,
      });
      if (res.status === 429) this.budget.markQuota();
      return res;
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }
}

async function loadEligibleJoueurs(supabase: SupabaseClient) {
  return supabase
    .from("joueurs")
    .select(SYNC_JOUEURS_SELECT)
    .or("statut.is.null,statut.eq.actif");
}

function rankingMapForCible(caches: RankingCacheMaps, cible: ClassementExterneCible) {
  if (cible === "ATP") return caches.atp;
  if (cible === "WTA") return caches.wta;
  return caches.itfJunior;
}

function externalIdFor(j: JoueurSyncRow, cible: ClassementExterneCible): string | null {
  if (cible === "ATP") return j.external_atp_id?.trim() ?? null;
  if (cible === "WTA") return j.external_wta_id?.trim() ?? null;
  return j.external_itf_junior_id?.trim() ?? null;
}

function externalColFor(cible: ClassementExterneCible): string | null {
  if (cible === "ATP") return "external_atp_id";
  if (cible === "WTA") return "external_wta_id";
  if (cible === "ITF Junior") return "external_itf_junior_id";
  return null;
}

function expectedGenre(cible: ClassementExterneCible): "M" | "F" | null {
  if (cible === "ATP") return "M";
  if (cible === "WTA") return "F";
  return null;
}

function hitFromProfileCache(
  profiles: Map<string, CachedProfile>,
  externalId: string | null,
  cible: ClassementExterneCible
): RankingHit | null {
  if (!externalId) return null;
  const cached = profiles.get(externalId);
  if (!cached) return null;
  const genre = expectedGenre(cible);
  if (genre && cached.genre && cached.genre !== genre) return null;
  return profileToHit(cached);
}

function pushDetail(
  summary: SyncClassementsSummary,
  j: JoueurSyncRow,
  cible: ClassementExterneCible | null,
  status: string,
  message?: string
) {
  summary.details.push({
    joueur_id: j.id,
    nom: playerDisplayName(j),
    categorie_age: j.categorie_age,
    categorie: cible,
    status,
    message,
  });
}

function bumpStats(
  summary: SyncClassementsSummary,
  cible: ClassementExterneCible,
  field: keyof CategorieSyncStats
) {
  summary.par_categorie[cible][field]++;
}

async function upsertClassement(
  supabase: SupabaseClient,
  j: JoueurSyncRow,
  categorie: ClassementExterneCible,
  hit: RankingHit,
  nowIso: string,
  source: string
) {
  return upsertClassementExterne(supabase, {
    joueur_id: j.id,
    nom_joueur: playerDisplayName(j),
    categorie,
    hit,
    date_maj: nowIso,
    source,
  });
}

type SyncCtx = {
  supabase: SupabaseClient;
  summary: SyncClassementsSummary;
  caches: RankingCacheMaps;
  nowIso: string;
  source: string;
  api?: RapidApiClient;
  budget?: ApiBudget;
  allowSearch: boolean;
  pendingQueue: Set<string>;
};

async function resolveFromProfile(ctx: SyncCtx, externalId: string, cible: ClassementExterneCible) {
  const cached = hitFromProfileCache(ctx.caches.profiles, externalId, cible);
  if (cached) return cached;
  if (!ctx.api || !ctx.budget?.canSpend()) return null;

  const res = await ctx.api.get(`/api/tennis/team/${encodeURIComponent(externalId)}/rankings`);
  if (!res?.ok) {
    if (res?.status === 429) ctx.budget.markQuota();
    return null;
  }
  const json = await res.json().catch(() => null);
  const profile = extractAndCacheProfile(externalId, json);
  if (!profile) return null;
  const genre = expectedGenre(cible);
  if (genre && profile.genre && profile.genre !== genre) return null;
  await saveProfileCache(ctx.supabase, externalId, profile);
  ctx.caches.profiles.set(externalId, profile);
  return profileToHit(profile);
}

async function resolveFromSearch(
  ctx: SyncCtx,
  j: JoueurSyncRow,
  cible: ClassementExterneCible
): Promise<{ hit: RankingHit | null; reason?: string }> {
  if (!ctx.api || !ctx.allowSearch) {
    return { hit: null, reason: "recherche API désactivée (mode cache)" };
  }
  if (!ctx.budget?.canSpend(2)) {
    ctx.pendingQueue.add(j.id);
    return { hit: null, reason: "quota API épuisé — file d'attente" };
  }

  const genre = expectedGenre(cible);
  const term = searchTermsForJoueur(j.prenom, j.nom)[0];
  if (!term) return { hit: null, reason: "terme de recherche vide" };

  const res = await ctx.api.get(`/api/tennis/search/${encodeURIComponent(term)}`);
  if (!res) return { hit: null, reason: "quota API épuisé — file d'attente" };
  if (res.status === 429) {
    ctx.budget?.markQuota();
    ctx.pendingQueue.add(j.id);
    return { hit: null, reason: "quota RapidAPI atteint (429)" };
  }
  if (!res.ok) return { hit: null, reason: `recherche HTTP ${res.status}` };

  const match = pickSearchMatch(
    j.prenom,
    j.nom,
    extractSearchPlayers(await res.json().catch(() => null)),
    genre ?? undefined,
    PREFERRED_COUNTRY
  );
  if (!match?.playerId) {
    return { hit: null, reason: `aucun candidat API pour « ${term} » (pays ${PREFERRED_COUNTRY} prioritaire)` };
  }
  if (!ctx.budget.canSpend()) {
    ctx.pendingQueue.add(j.id);
    return { hit: null, reason: "quota API épuisé avant profil — file d'attente" };
  }

  const col = externalColFor(cible);
  if (col) {
    await ctx.supabase.from("joueurs").update({ [col]: match.playerId }).eq("id", j.id);
  }
  const hit = await resolveFromProfile(ctx, match.playerId, cible);
  if (!hit) return { hit: null, reason: "profil API sans classement exploitable" };
  return { hit };
}

async function resolveJoueur(
  ctx: SyncCtx,
  j: JoueurSyncRow,
  cible: ClassementExterneCible
): Promise<{ hit: RankingHit | null; reason?: string }> {
  let externalId = externalIdFor(j, cible);
  if (externalId) {
    const fromProfile = await resolveFromProfile(ctx, externalId, cible);
    if (fromProfile) return { hit: fromProfile };
  }

  const cache = rankingMapForCible(ctx.caches, cible);
  if (cache.size) {
    const fromCache = findJoueurInRankingCache(j.prenom, j.nom, cache);
    if (fromCache) return { hit: fromCache };
  }

  return resolveFromSearch(ctx, j, cible);
}

async function processJoueur(
  ctx: SyncCtx,
  j: JoueurSyncRow,
  cible: ClassementExterneCible
): Promise<void> {
  bumpStats(ctx.summary, cible, "traites");
  ctx.summary.lignes_traitees++;

  try {
    const { hit, reason } = await resolveJoueur(ctx, j, cible);
    if (!hit) {
      bumpStats(ctx.summary, cible, "introuvables");
      ctx.summary.introuvables++;
      pushDetail(ctx.summary, j, cible, "not_found", reason ?? `Non trouvé dans ${cible}`);
      return;
    }

    const { error } = await upsertClassement(ctx.supabase, j, cible, hit, ctx.nowIso, ctx.source);
    if (error) {
      bumpStats(ctx.summary, cible, "erreurs");
      ctx.summary.erreurs++;
      ctx.summary.ok = false;
      pushDetail(ctx.summary, j, cible, "error", error.message);
      return;
    }

    bumpStats(ctx.summary, cible, "synchronises");
    ctx.summary.synchronises++;
    pushDetail(ctx.summary, j, cible, "ok");
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    bumpStats(ctx.summary, cible, "erreurs");
    ctx.summary.erreurs++;
    ctx.summary.ok = false;
    pushDetail(ctx.summary, j, cible, "error", `Exception: ${msg}`);
  }
}

function sortForApiSync(list: JoueurSyncRow[], queueIds: Set<string>) {
  const priority = (j: JoueurSyncRow) => {
    const cat = (j.categorie_age ?? "").trim();
    if (cat === "Elite Pro") return 0;
    if (queueIds.has(j.id)) return 1;
    return 2;
  };
  return [...list].sort((a, b) => {
    const pa = priority(a);
    const pb = priority(b);
    if (pa !== pb) return pa - pb;
    return playerDisplayName(a).localeCompare(playerDisplayName(b), "fr");
  });
}

async function loadTourRankings(
  api: RapidApiClient,
  supabase: SupabaseClient,
  tour: Tour,
  cache: Map<string, RankingHit>,
  messages: string[]
) {
  const res = await api.get(`/api/tennis/rankings/${tour}`);
  if (!res) return;
  if (res.status === 429) {
    messages.push(`Quota RapidAPI atteint sur ${tour.toUpperCase()}`);
    return;
  }
  if (!res.ok) {
    messages.push(`${tour.toUpperCase()} rankings HTTP ${res.status}`);
    return;
  }
  const json = await res.json().catch(() => null);
  await saveRankingSnapshot(
    supabase,
    tour === "atp" ? CACHE_KEYS.atpRankings : CACHE_KEYS.wtaRankings,
    json
  );
  for (const row of extractRankingRows(json)) {
    const key = row.name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (!key || cache.has(key)) continue;
    cache.set(key, { rang: row.position, points: row.points, apiPlayerId: row.playerId });
  }
  messages.push(`Cache ${tour.toUpperCase()}: ${cache.size} joueur(s), 1 appel`);
}

async function loadItfJuniorCache(
  api: RapidApiClient,
  supabase: SupabaseClient,
  cache: Map<string, RankingHit>,
  messages: string[]
): Promise<string> {
  for (const path of ITF_ENDPOINT_CANDIDATES) {
    if (!api.budget.canSpend()) break;
    const res = await api.get(path);
    if (!res) break;
    if (res.status === 429) {
      api.budget.markQuota();
      return "quota ITF";
    }
    if (!res.ok) continue;
    const json = await res.json().catch(() => null);
    const rows = extractRankingRows(json);
    if (!rows.length) continue;
    await saveRankingSnapshot(supabase, CACHE_KEYS.itfJuniorRankings, json);
    for (const row of rows) {
      const key = row.name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      if (!key || cache.has(key)) continue;
      cache.set(key, { rang: row.position, points: row.points, apiPlayerId: row.playerId });
    }
    messages.push(`Cache ITF Junior: ${cache.size} joueur(s) via ${path}`);
    return path;
  }
  return "non disponible sur tennisapi1 — recherche joueur par joueur";
}

async function runSyncCore(
  mode: SyncMode,
  api: RapidApiClient | null,
  allowSearch: boolean
): Promise<SyncClassementsSummary> {
  const summary = baseSummary(mode);
  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    return { ...summary, ok: false, error: "SUPABASE_SERVICE_ROLE_KEY manquant" };
  }

  const { data: raw, error } = await loadEligibleJoueurs(supabase);
  if (error) return { ...summary, ok: false, error: error.message };

  const list = (raw ?? []).map((j) => cleanJoueur(j as JoueurSyncRow));
  summary.traites = list.length;

  const { atp, wta, itf, ignores } = groupeParCible(list);
  const caches = await loadRankingCaches(supabase);
  summary.messages.push(...caches.messages);

  if (mode === "cache" && !caches.atp.size && !caches.wta.size && !caches.itfJunior.size && !caches.profiles.size) {
    return {
      ...summary,
      ok: false,
      error: "Cache vide",
      messages: [
        ...summary.messages,
        "Lancez « Màj ATP/WTA » (2 appels) puis « Recherche API » pour les hors top 500.",
      ],
    };
  }

  const queueState = await loadSyncQueue();
  const queueIds = new Set(queueState.pending_ids);
  const pendingQueue = new Set<string>();

  if (api) {
    if (atp.length && api.budget.canSpend() && !caches.atp.size) {
      await loadTourRankings(api, supabase, "atp", caches.atp, summary.messages);
    } else if (caches.atp.size) {
      summary.messages.push(`Réutilisation cache ATP (${caches.atp.size}) — 0 appel`);
    }
    if (wta.length && api.budget.canSpend() && !caches.wta.size) {
      await loadTourRankings(api, supabase, "wta", caches.wta, summary.messages);
    } else if (caches.wta.size) {
      summary.messages.push(`Réutilisation cache WTA (${caches.wta.size}) — 0 appel`);
    }
  }

  const nowIso = new Date().toISOString();
  const ctx: SyncCtx = {
    supabase,
    summary,
    caches,
    nowIso,
    source: mode === "cache" ? SOURCE_CACHE : SOURCE,
    api: api ?? undefined,
    budget: api?.budget,
    allowSearch,
    pendingQueue,
  };

  for (const { joueur, raison } of ignores) {
    summary.ignores++;
    pushDetail(summary, joueur, null, "ignored", raison);
  }

  const processGroup = async (players: JoueurSyncRow[], cible: ClassementExterneCible) => {
    const ordered = allowSearch ? sortForApiSync(players, queueIds) : players;
    for (const j of ordered) {
      await processJoueur(ctx, j, cible);
    }
  };

  await processGroup(atp, "ATP");
  await processGroup(wta, "WTA");

  if (api && itf.length && allowSearch) {
    if (caches.itfJunior.size) {
      summary.itf_junior_endpoint = "cache local";
      summary.messages.push(`Réutilisation cache ITF (${caches.itfJunior.size}) — 0 appel`);
    } else if (api.budget.canSpend()) {
      summary.itf_junior_endpoint = await loadItfJuniorCache(
        api,
        supabase,
        caches.itfJunior,
        summary.messages
      );
    } else {
      summary.itf_junior_endpoint = "reporté (quota réservé aux Elite Pro)";
    }
  }

  await processGroup(itf, "ITF Junior");

  if (pendingQueue.size) {
    await saveSyncQueue({
      pending_ids: [...pendingQueue],
      updated_at: nowIso,
    });
    summary.en_attente_quota = pendingQueue.size;
    summary.messages.push(
      `${pendingQueue.size} joueur(s) en file d'attente (quota ${MAX_API_CALLS}/j) — relancez « Recherche API » demain`
    );
  } else if (queueState.pending_ids.length) {
    await saveSyncQueue({ pending_ids: [], updated_at: nowIso });
  }

  summary.api_calls_used = api?.budget.used ?? 0;
  summary.last_sync_at = nowIso;

  const { ATP, WTA, "ITF Junior": itfStats } = summary.par_categorie;
  summary.messages.push(
    `ATP: ${ATP.synchronises}/${ATP.traites} trouvés · WTA: ${WTA.synchronises}/${WTA.traites} · ITF: ${itfStats.synchronises}/${itfStats.traites}`
  );

  if (summary.erreurs > 0 && summary.synchronises === 0) summary.ok = false;
  if (api?.budget.quotaHit && summary.synchronises === 0) {
    summary.ok = false;
    summary.error = summary.error ?? "Quota RapidAPI journalier atteint";
  }

  return summary;
}

/** Sync locale — 0 appel RapidAPI. */
export async function runSyncClassementsFromCache(): Promise<SyncClassementsSummary> {
  return runSyncCore("cache", null, false);
}

/** 2 appels API : snapshots ATP + WTA puis sync cache. */
export async function runSyncClassementsRankingsOnly(): Promise<SyncClassementsSummary> {
  const rapidKey = process.env.RAPIDAPI_KEY?.trim();
  const rapidHost = process.env.RAPIDAPI_HOST?.trim() || "tennisapi1.p.rapidapi.com";
  if (!rapidKey) {
    return { ...baseSummary("rankings"), ok: false, error: "RAPIDAPI_KEY manquant côté serveur" };
  }
  const api = new RapidApiClient(rapidKey, rapidHost, new ApiBudget(MAX_API_CALLS));
  const partial = await runSyncCore("rankings", api, false);
  return { ...partial, mode: "rankings", via: "server-fallback" };
}

/** Recherche API complète avec file d'attente quota. */
export async function runSyncClassementsServer(mode: SyncMode = "api"): Promise<SyncClassementsSummary> {
  if (mode === "cache") return runSyncClassementsFromCache();
  if (mode === "rankings") return runSyncClassementsRankingsOnly();

  const rapidKey = process.env.RAPIDAPI_KEY?.trim();
  const rapidHost = process.env.RAPIDAPI_HOST?.trim() || "tennisapi1.p.rapidapi.com";
  if (!rapidKey) {
    return { ...baseSummary("api"), ok: false, error: "RAPIDAPI_KEY manquant côté serveur" };
  }
  const api = new RapidApiClient(rapidKey, rapidHost, new ApiBudget(MAX_API_CALLS));
  return runSyncCore("api", api, true);
}
