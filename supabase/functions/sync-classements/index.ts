/**

 * Edge Function — synchronisation classements ATP / WTA / ITF Juniors (RapidAPI).

 * Plan gratuit : pagination ciblée du classement avant recherche joueur.

 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { createClient } from "npm:@supabase/supabase-js@2";



const SOURCE = "rapidapi-tennis-api-atp-wta-itf";

const API_TIMEOUT_MS = 12_000;

const RANKING_PAGE_SIZE = 100;

const MAX_RANKING_PAGES = 8;

const MAX_API_CALLS_PER_RUN = 18;

const MAX_PLAYER_SEARCHES = 3;

const EXECUTION_BUDGET_MS = 120_000;



type Tour = "atp" | "wta";

type CategorieExterne = "ATP" | "WTA" | "ITF Junior";



type JoueurRow = {

  id: string;

  nom: string;

  prenom: string;

  date_naissance: string | null;

  sexe: string | null;

  external_atp_id: string | null;

  external_wta_id: string | null;

  external_itf_junior_id: string | null;

  statut: string | null;

};



type RankingHit = {

  rang: number;

  points: number | null;

  apiPlayerId: string | null;

};



type PlayerResult = {

  joueur_id: string;

  nom: string;

  categorie: CategorieExterne | null;

  status: "ok" | "skipped" | "not_found" | "error";

  message?: string;

};



type Summary = {

  ok: boolean;

  traites: number;

  synchronises: number;

  ignores: number;

  introuvables: number;

  erreurs: number;

  itf_junior_endpoint: string;

  api_calls_used: number;

  details: PlayerResult[];

  messages: string[];

};



function jsonResponse(body: unknown, status = 200): Response {

  return new Response(JSON.stringify(body), {

    status,

    headers: { "Content-Type": "application/json" },

  });

}



function normalizeName(value: string): string {

  return value

    .normalize("NFD")

    .replace(/[\u0300-\u036f]/g, "")

    .toLowerCase()

    .replace(/[^a-z0-9\s]/g, " ")

    .replace(/\s+/g, " ")

    .trim();

}



function nameTokens(value: string): string[] {

  return normalizeName(value).split(" ").filter((t) => t.length >= 2);

}



function playerDisplayName(j: JoueurRow): string {

  return `${j.prenom} ${j.nom}`.trim();

}



function nameKeys(j: JoueurRow): string[] {

  const full = normalizeName(playerDisplayName(j));

  const reversed = normalizeName(`${j.nom} ${j.prenom}`);

  return [...new Set([full, reversed].filter(Boolean))];

}



function calcAgeYears(dateNaissance: string, ref = new Date()): number | null {

  const day = dateNaissance.slice(0, 10);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;

  const birth = new Date(`${day}T12:00:00Z`);

  if (Number.isNaN(birth.getTime())) return null;

  let age = ref.getUTCFullYear() - birth.getUTCFullYear();

  const m = ref.getUTCMonth() - birth.getUTCMonth();

  if (m < 0 || (m === 0 && ref.getUTCDate() < birth.getUTCDate())) age -= 1;

  return age;

}



function tourForSexe(sexe: string | null): Tour | null {

  const s = (sexe ?? "").trim().toUpperCase();

  if (s === "M" || s === "H" || s === "HOMME") return "atp";

  if (s === "F" || s === "FEMME") return "wta";

  return null;

}



function categorieForTour(tour: Tour): CategorieExterne {

  return tour === "atp" ? "ATP" : "WTA";

}



function pick(obj: Record<string, unknown>, keys: string[]): unknown {

  for (const k of keys) if (k in obj) return obj[k];

  return undefined;

}



class ApiBudget {

  used = 0;

  quotaHit = false;

  constructor(private readonly max: number) {}

  canSpend(n = 1): boolean {

    return !this.quotaHit && this.used + n <= this.max;

  }

  markQuota() {

    this.quotaHit = true;

  }

}



class RapidApiClient {

  constructor(

    private readonly key: string,

    private readonly host: string,

    private readonly budget: ApiBudget

  ) {}



  async get(path: string, query: Record<string, string> = {}): Promise<Response | null> {

    if (!this.budget.canSpend()) return null;

    const url = new URL(`https://${this.host}${path}`);

    for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v);

    const controller = new AbortController();

    const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

    try {

      this.budget.used += 1;

      const res = await fetch(url.toString(), {

        method: "GET",

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



function parseRankingLikeObject(item: unknown, opts: { allowMissingRank?: boolean } = {}) {

  if (!item || typeof item !== "object") return null;

  const row = item as Record<string, unknown>;

  const playerObj =

    row.player && typeof row.player === "object"

      ? (row.player as Record<string, unknown>)

      : null;



  const firstName =

    typeof pick(row, ["firstName", "first_name", "givenName"]) === "string"

      ? String(pick(row, ["firstName", "first_name", "givenName"]))

      : typeof playerObj?.firstName === "string"

        ? playerObj.firstName

        : "";

  const lastName =

    typeof pick(row, ["lastName", "last_name", "familyName", "surname"]) === "string"

      ? String(pick(row, ["lastName", "last_name", "familyName", "surname"]))

      : typeof playerObj?.lastName === "string"

        ? playerObj.lastName

        : "";

  const combinedName = `${firstName} ${lastName}`.trim();



  const nameRaw = pick(row, ["player", "name", "player_name", "fullName", "playerName", "title"]);

  const name =

    typeof nameRaw === "string"

      ? nameRaw.trim()

      : typeof playerObj?.name === "string"

        ? playerObj.name.trim()

        : combinedName || "";

  if (!name) return null;



  const positionRaw =

    pick(row, ["rank", "position", "currentRank", "racePosition", "ranking"]) ??

    pick(playerObj ?? {}, ["rank", "position", "currentRank"]);

  const position =

    typeof positionRaw === "number"

      ? positionRaw

      : typeof positionRaw === "string" && /^\d+$/.test(positionRaw)

        ? Number(positionRaw)

        : null;

  if (position == null && !opts.allowMissingRank) return null;



  const pointsRaw = pick(row, ["points", "rankingPoints", "racePoints", "ranking_points"]);

  const points =

    typeof pointsRaw === "number"

      ? pointsRaw

      : typeof pointsRaw === "string" && pointsRaw.trim() !== ""

        ? Number(pointsRaw)

        : null;



  const idRaw = pick(row, ["player_id", "playerId", "id", "key", "player_key", "playerKey"]);

  return {

    name,

    position: position ?? 0,

    points: Number.isFinite(points as number) ? (points as number) : null,

    playerId: idRaw == null ? null : String(idRaw).trim() || null,

  };

}



function extractRankingRows(payload: unknown) {

  const root =

    payload && typeof payload === "object" ? (payload as Record<string, unknown>) : null;

  const list = Array.isArray(payload)

    ? payload

    : Array.isArray(root?.rankings)

      ? (root.rankings as unknown[])

      : Array.isArray(root?.data)

        ? (root.data as unknown[])

        : [];

  const rows = [];

  for (const item of list) {

    const row = parseRankingLikeObject(item);

    if (row) rows.push(row);

  }

  return rows;

}



function extractSearchPlayers(payload: unknown) {

  const root =

    payload && typeof payload === "object" ? (payload as Record<string, unknown>) : null;

  if (!root) return [];

  const buckets: unknown[] = [];

  if (Array.isArray(root.players)) buckets.push(...root.players);

  if (Array.isArray(root.data)) buckets.push(...root.data);

  else if (root.data && typeof root.data === "object") {

    const nested = root.data as Record<string, unknown>;

    if (Array.isArray(nested.players)) buckets.push(...nested.players);

  }

  if (Array.isArray(root.results)) buckets.push(...root.results);

  const rows = [];

  for (const item of buckets) {

    const row = parseRankingLikeObject(item, { allowMissingRank: true });

    if (row) rows.push(row);

  }

  return rows;

}



function extractProfileRanking(payload: unknown): RankingHit | null {

  if (!payload || typeof payload !== "object") return null;

  const p = payload as Record<string, unknown>;

  const curRank = p.curRank as Record<string, unknown> | undefined;

  const positionRaw = pick(curRank ?? {}, ["position", "rank"]) ?? pick(p, ["currentRank", "position", "rank"]);

  const position =

    typeof positionRaw === "number"

      ? positionRaw

      : typeof positionRaw === "string" && /^\d+$/.test(positionRaw)

        ? Number(positionRaw)

        : null;

  const pointsRaw = pick(curRank ?? {}, ["points"]) ?? pick(p, ["points"]);

  const points =

    typeof pointsRaw === "number"

      ? pointsRaw

      : typeof pointsRaw === "string" && pointsRaw.trim() !== ""

        ? Number(pointsRaw)

        : null;

  if (position == null) return null;

  return { rang: position, points: Number.isFinite(points as number) ? (points as number) : null, apiPlayerId: null };

}



function fuzzyTokensMatch(playerTokens: string[], cacheKey: string): boolean {

  const cacheTokens = cacheKey.split(" ").filter(Boolean);

  if (!playerTokens.length || !cacheTokens.length) return false;

  const lastName = playerTokens[playerTokens.length - 1];

  if (!cacheTokens.includes(lastName)) return false;

  const firstName = playerTokens[0];

  if (!firstName || firstName === lastName) return true;

  return cacheTokens.some(

    (t) =>

      t === firstName ||

      t.startsWith(firstName.slice(0, Math.min(3, firstName.length))) ||

      firstName.startsWith(t.slice(0, Math.min(3, t.length)))

  );

}



function findInRankingCache(j: JoueurRow, cache: Map<string, RankingHit>) {

  for (const key of nameKeys(j)) {

    const hit = cache.get(key);

    if (hit) return hit;

  }

  const tokens = nameTokens(playerDisplayName(j));

  if (tokens.length < 2) return null;

  for (const [cacheKey, hit] of cache) {

    if (fuzzyTokensMatch(tokens, cacheKey)) return hit;

  }

  return null;

}



function pickSearchMatch(j: JoueurRow, rows: ReturnType<typeof extractSearchPlayers>) {

  const expected = new Set(nameKeys(j));

  const exact = rows.find((r) => expected.has(normalizeName(r.name)));

  if (exact?.playerId) return exact;

  const tokens = nameTokens(playerDisplayName(j));

  for (const row of rows) {

    if (!row.playerId) continue;

    if (fuzzyTokensMatch(tokens, normalizeName(row.name))) return row;

  }

  return null;

}



async function fetchProfileRanking(api: RapidApiClient, tour: Tour, externalId: string) {

  const id = externalId.trim();

  if (!id) return null;

  const res = await api.get(`/tennis/v2/${tour}/player/profile/${encodeURIComponent(id)}`, {

    include: "ranking",

  });

  if (!res || !res.ok) return null;

  const hit = extractProfileRanking(await res.json().catch(() => null));

  if (!hit) return null;

  return { ...hit, apiPlayerId: id };

}



async function resolvePlayerId(api: RapidApiClient, joueur: JoueurRow) {

  const queries = [playerDisplayName(joueur), joueur.nom.trim()];

  for (const q of [...new Set(queries.filter(Boolean))]) {

    const res = await api.get("/tennis/v2/search", { query: q });

    if (!res || res.status === 429 || !res.ok) continue;

    const match = pickSearchMatch(joueur, extractSearchPlayers(await res.json().catch(() => null)));

    if (match?.playerId) return match.playerId;

  }

  return null;

}



async function loadTourRankingsUntil(

  api: RapidApiClient,

  budget: ApiBudget,

  tour: Tour,

  pending: JoueurRow[],

  cache: Map<string, RankingHit>,

  messages: string[]

) {

  const path = `/tennis/v2/${tour}/ranking/singles`;

  let pagesLoaded = 0;



  for (let page = 1; page <= MAX_RANKING_PAGES; page++) {

    if (!budget.canSpend()) break;

    const stillPending = pending.filter((j) => !findInRankingCache(j, cache));

    if (!stillPending.length) break;



    const res = await api.get(path, {

      pageNo: String(page),

      pageSize: String(RANKING_PAGE_SIZE),

    });

    if (!res) break;

    if (res.status === 429) {

      messages.push(`Quota RapidAPI atteint sur ${tour.toUpperCase()}`);

      break;

    }

    if (!res.ok) {

      messages.push(`${tour.toUpperCase()} ${path} HTTP ${res.status}`);

      break;

    }



    const rows = extractRankingRows(await res.json().catch(() => null));

    if (!rows.length) break;

    pagesLoaded += 1;



    for (const row of rows) {

      const key = normalizeName(row.name);

      if (!key || cache.has(key)) continue;

      cache.set(key, { rang: row.position, points: row.points, apiPlayerId: row.playerId });

    }



    if (rows.length < RANKING_PAGE_SIZE) break;

  }



  messages.push(`Cache ${tour.toUpperCase()}: ${cache.size} joueur(s), ${pagesLoaded} page(s)`);

}



async function loadItfJuniorCache(api: RapidApiClient, messages: string[]) {

  const map = new Map<string, RankingHit>();

  const res = await api.get("/tennis/v2/itf/ranking/singles");

  if (!res) return { cache: map, status: "budget API épuisé" };

  if (res.status === 429) return { cache: map, status: "HTTP 429 quota ITF" };

  if (!res.ok) return { cache: map, status: `ITF HTTP ${res.status}` };

  const rows = extractRankingRows(await res.json().catch(() => null));

  for (const row of rows) {

    const key = normalizeName(row.name);

    if (!key) continue;

    map.set(key, { rang: row.position, points: row.points, apiPlayerId: row.playerId });

  }

  messages.push(`Cache ITF Junior: ${map.size} joueur(s)`);

  return { cache: map, status: rows.length ? "/tennis/v2/itf/ranking/singles" : "ITF réponse vide" };

}



async function upsertClassement(

  supabase: ReturnType<typeof createClient>,

  j: JoueurRow,

  categorie: CategorieExterne,

  hit: RankingHit,

  nowIso: string

) {

  return supabase.from("classements_externes").upsert(

    {

      joueur_id: j.id,

      nom_joueur: playerDisplayName(j),

      categorie,

      rang: hit.rang,

      points: hit.points,

      date_maj: nowIso,

      source: SOURCE,

    },

    { onConflict: "joueur_id,categorie" }

  );

}



Deno.serve(async (req: Request) => {

  if (req.method === "OPTIONS") {

    return new Response(null, {

      headers: {

        "Access-Control-Allow-Origin": "*",

        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",

      },

    });

  }

  if (req.method !== "POST" && req.method !== "GET") {

    return jsonResponse({ error: "Méthode non autorisée" }, 405);

  }



  const rapidKey = Deno.env.get("RAPIDAPI_KEY")?.trim();

  const rapidHost = Deno.env.get("RAPIDAPI_HOST")?.trim() || "tennis-api-atp-wta-itf.p.rapidapi.com";

  const supabaseUrl = Deno.env.get("SUPABASE_URL")?.trim();

  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();

  if (!rapidKey) return jsonResponse({ error: "RAPIDAPI_KEY manquant" }, 500);

  const probeUrl = new URL(req.url);
  if (probeUrl.searchParams.get("probe") === "1") {
    const path = "/tennis/v2/atp/ranking/singles";
    const apiUrl = new URL(`https://${rapidHost}${path}`);
    apiUrl.searchParams.set("pageNo", "1");
    apiUrl.searchParams.set("pageSize", "1");
    const res = await fetch(apiUrl.toString(), {
      method: "GET",
      headers: {
        "x-rapidapi-key": rapidKey,
        "x-rapidapi-host": rapidHost,
      },
    });
    const raw = await res.text();
    let payload: unknown = null;
    try {
      payload = JSON.parse(raw);
    } catch {
      payload = { raw: raw.slice(0, 300) };
    }
    const rows = extractRankingRows(payload);
    const data0 =
      payload && typeof payload === "object" && Array.isArray((payload as Record<string, unknown>).data)
        ? ((payload as Record<string, unknown>).data as unknown[])[0]
        : null;
    return jsonResponse(
      {
        probe: true,
        api_calls: 1,
        host: rapidHost,
        path,
        http_status: res.status,
        ok: res.ok,
        quota_blocked: res.status === 429,
        rows_parsed: rows.length,
        sample_row: rows[0] ?? null,
        sample_keys: data0 && typeof data0 === "object" ? Object.keys(data0 as object) : [],
        rate_limit_remaining:
          res.headers.get("x-ratelimit-requests-remaining") ??
          res.headers.get("X-RateLimit-Requests-Remaining"),
      },
      res.ok ? 200 : res.status === 429 ? 429 : 502
    );
  }

  if (!supabaseUrl || !serviceKey) {
    return jsonResponse({ error: "SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquant" }, 500);
  }

  const budget = new ApiBudget(MAX_API_CALLS_PER_RUN);

  const api = new RapidApiClient(rapidKey, rapidHost, budget);

  const supabase = createClient(supabaseUrl, serviceKey, {

    auth: { persistSession: false, autoRefreshToken: false },

  });



  const summary: Summary = {

    ok: true,

    traites: 0,

    synchronises: 0,

    ignores: 0,

    introuvables: 0,

    erreurs: 0,

    itf_junior_endpoint: "non testé",

    api_calls_used: 0,

    details: [],

    messages: [],

  };



  const { data: joueurs, error: joueursError } = await supabase

    .from("joueurs")

    .select(

      "id, nom, prenom, date_naissance, sexe, external_atp_id, external_wta_id, external_itf_junior_id, statut"

    )

    .or("statut.is.null,statut.eq.actif");

  if (joueursError) return jsonResponse({ error: joueursError.message }, 500);



  const list = (joueurs ?? []) as JoueurRow[];

  summary.traites = list.length;

  const now = new Date();

  const nowIso = now.toISOString();

  const startedAt = Date.now();



  const adults: JoueurRow[] = [];

  const juniors: JoueurRow[] = [];

  for (const j of list) {

    if (!j.date_naissance) continue;

    const age = calcAgeYears(j.date_naissance, now);

    if (age == null) continue;

    if (age < 18) juniors.push(j);

    else adults.push(j);

  }



  const atpAdults = adults.filter((j) => tourForSexe(j.sexe) === "atp");

  const wtaAdults = adults.filter((j) => tourForSexe(j.sexe) === "wta");

  const atpCache = new Map<string, RankingHit>();

  const wtaCache = new Map<string, RankingHit>();



  if (atpAdults.length && budget.canSpend()) {

    await loadTourRankingsUntil(api, budget, "atp", atpAdults, atpCache, summary.messages);

  }

  if (wtaAdults.length && budget.canSpend()) {

    await loadTourRankingsUntil(api, budget, "wta", wtaAdults, wtaCache, summary.messages);

  }



  let searchCount = 0;



  for (const j of adults) {

    if (Date.now() - startedAt > EXECUTION_BUDGET_MS) break;



    const label = playerDisplayName(j);

    const result: PlayerResult = { joueur_id: j.id, nom: label, categorie: null, status: "skipped" };



    const tour = tourForSexe(j.sexe);

    if (!tour) {

      result.message = "sexe non renseigné (M/F)";

      summary.ignores += 1;

      summary.details.push(result);

      continue;

    }

    result.categorie = categorieForTour(tour);



    let externalId = (tour === "atp" ? j.external_atp_id : j.external_wta_id)?.trim() || null;

    let hit: RankingHit | null = null;



    if (externalId && budget.canSpend()) {

      hit = await fetchProfileRanking(api, tour, externalId);

    }



    const cache = tour === "atp" ? atpCache : wtaCache;

    if (!hit && cache.size) hit = findInRankingCache(j, cache);



    if (!hit && !externalId && searchCount < MAX_PLAYER_SEARCHES && budget.canSpend()) {

      searchCount += 1;

      const resolved = await resolvePlayerId(api, j);

      if (resolved) {

        externalId = resolved;

        const col = tour === "atp" ? "external_atp_id" : "external_wta_id";

        await supabase.from("joueurs").update({ [col]: resolved }).eq("id", j.id);

        if (budget.canSpend()) hit = await fetchProfileRanking(api, tour, resolved);

      }

    }



    if (!hit) {

      result.status = "not_found";

      result.message = `Non trouvé dans ${result.categorie}`;

      summary.introuvables += 1;

      summary.details.push(result);

      continue;

    }



    const { error } = await upsertClassement(supabase, j, result.categorie!, hit, nowIso);

    if (error) {

      result.status = "error";

      result.message = error.message;

      summary.erreurs += 1;

      summary.ok = false;

    } else {

      result.status = "ok";

      summary.synchronises += 1;

    }

    summary.details.push(result);

  }



  if (juniors.length && budget.canSpend() && !budget.quotaHit) {

    const { cache, status } = await loadItfJuniorCache(api, summary.messages);

    summary.itf_junior_endpoint = status;



    for (const j of juniors) {

      if (Date.now() - startedAt > EXECUTION_BUDGET_MS) break;

      const label = playerDisplayName(j);

      const result: PlayerResult = {

        joueur_id: j.id,

        nom: label,

        categorie: "ITF Junior",

        status: "skipped",

      };

      const hit = findInRankingCache(j, cache);

      if (!hit) {

        result.status = "not_found";

        result.message = status;

        summary.introuvables += 1;

        summary.details.push(result);

        continue;

      }

      const { error } = await upsertClassement(supabase, j, "ITF Junior", hit, nowIso);

      if (error) {

        result.status = "error";

        result.message = error.message;

        summary.erreurs += 1;

        summary.ok = false;

      } else {

        result.status = "ok";

        summary.synchronises += 1;

      }

      summary.details.push(result);

    }

  } else if (juniors.length) {

    summary.messages.push("Juniors ITF ignorés (quota API)");

  }



  for (const j of list.filter((x) => !x.date_naissance)) {

    summary.details.push({

      joueur_id: j.id,

      nom: playerDisplayName(j),

      categorie: null,

      status: "error",

      message: "date_naissance manquante",

    });

    summary.erreurs += 1;

  }



  summary.api_calls_used = budget.used;

  if (summary.erreurs > 0 && summary.synchronises === 0) summary.ok = false;

  if (summary.synchronises === 0 && budget.quotaHit) {

    summary.messages.push("Quota RapidAPI dépassé — réessayez après reset");

  }



  const status = summary.synchronises > 0 ? 200 : summary.ok ? 200 : 502;

  return jsonResponse(summary, status);

});


