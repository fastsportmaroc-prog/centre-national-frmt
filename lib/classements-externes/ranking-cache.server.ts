import "server-only";

import { mkdir, readFile, writeFile } from "fs/promises";
import { join } from "path";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  extractProfileRanking,
  extractRankingRows,
  type ParsedRankingRow,
} from "@/lib/classements-externes/rapidapi-ranking-parse";

export const CACHE_KEYS = {
  atpRankings: "atp_rankings",
  wtaRankings: "wta_rankings",
  itfJuniorRankings: "itf_junior_rankings",
  syncQueue: "sync_queue",
  profile: (playerId: string) => `profile:${playerId}`,
} as const;

export type SyncQueueState = {
  pending_ids: string[];
  updated_at: string;
};

export type CachedProfile = {
  playerId: string;
  rang: number;
  points: number | null;
  genre: "M" | "F" | null;
  fetched_at: string;
};

export type RankingCacheMaps = {
  atp: Map<string, { rang: number; points: number | null; apiPlayerId?: string | null }>;
  wta: Map<string, { rang: number; points: number | null; apiPlayerId?: string | null }>;
  itfJunior: Map<string, { rang: number; points: number | null; apiPlayerId?: string | null }>;
  profiles: Map<string, CachedProfile>;
  messages: string[];
};

const CACHE_DIR = join(process.cwd(), "data", "classements-externes", "cache");

function cacheFilePath(cacheKey: string) {
  return join(CACHE_DIR, `${cacheKey.replace(/:/g, "_")}.json`);
}

async function ensureCacheDir() {
  await mkdir(CACHE_DIR, { recursive: true });
}

function rowsToMap(rows: ParsedRankingRow[]) {
  const map = new Map<string, { rang: number; points: number | null; apiPlayerId?: string | null }>();
  for (const row of rows) {
    const key = row.name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (!key || map.has(key)) continue;
    map.set(key, { rang: row.position, points: row.points, apiPlayerId: row.playerId });
  }
  return map;
}

async function saveFileCache(cacheKey: string, payload: unknown) {
  await ensureCacheDir();
  const body = {
    cache_key: cacheKey,
    payload,
    fetched_at: new Date().toISOString(),
  };
  await writeFile(cacheFilePath(cacheKey), JSON.stringify(body), "utf8");
}

async function loadFileCache(cacheKey: string): Promise<{ payload: unknown; fetched_at: string } | null> {
  try {
    const raw = await readFile(cacheFilePath(cacheKey), "utf8");
    const parsed = JSON.parse(raw) as { payload?: unknown; fetched_at?: string };
    if (!parsed.payload) return null;
    return { payload: parsed.payload, fetched_at: parsed.fetched_at ?? "" };
  } catch {
    return null;
  }
}

async function loadAllFileCaches(): Promise<
  Array<{ cache_key: string; payload: unknown; fetched_at: string }>
> {
  const keys = [CACHE_KEYS.atpRankings, CACHE_KEYS.wtaRankings, CACHE_KEYS.itfJuniorRankings];
  const rows: Array<{ cache_key: string; payload: unknown; fetched_at: string }> = [];
  for (const key of keys) {
    const hit = await loadFileCache(key);
    if (hit) rows.push({ cache_key: key, ...hit });
  }
  try {
    const { readdir } = await import("fs/promises");
    const files = await readdir(CACHE_DIR);
    for (const file of files) {
      if (!file.startsWith("profile_") || !file.endsWith(".json")) continue;
      const playerId = file.replace(/^profile_/, "").replace(/\.json$/, "");
      const hit = await loadFileCache(CACHE_KEYS.profile(playerId));
      if (hit) rows.push({ cache_key: CACHE_KEYS.profile(playerId), ...hit });
    }
  } catch {
    /* cache dir may not exist */
  }
  return rows;
}

function ingestCacheRow(
  result: RankingCacheMaps,
  key: string,
  payload: unknown,
  source: string
) {
    if (key === CACHE_KEYS.atpRankings) {
      result.atp = rowsToMap(extractRankingRows(payload));
      result.messages.push(`${source} ATP: ${result.atp.size} joueur(s)`);
    } else if (key === CACHE_KEYS.wtaRankings) {
      result.wta = rowsToMap(extractRankingRows(payload));
      result.messages.push(`${source} WTA: ${result.wta.size} joueur(s)`);
    } else if (key === CACHE_KEYS.itfJuniorRankings) {
      result.itfJunior = rowsToMap(extractRankingRows(payload));
      result.messages.push(`${source} ITF Junior: ${result.itfJunior.size} joueur(s)`);
    } else if (key.startsWith("profile:") && payload && typeof payload === "object") {
      const p = payload as CachedProfile;
      if (p.playerId && p.rang != null) {
        result.profiles.set(p.playerId, p);
      }
    }
}

export async function saveRankingSnapshot(
  supabase: SupabaseClient,
  cacheKey: string,
  payload: unknown
) {
  await saveFileCache(cacheKey, payload);
  const { error } = await supabase.from("classements_externes_api_cache").upsert({
    cache_key: cacheKey,
    payload: payload as Record<string, unknown>,
    fetched_at: new Date().toISOString(),
  });
  if (error) {
    /* fichier local suffit */
  }
}

export async function saveProfileCache(
  supabase: SupabaseClient,
  playerId: string,
  profile: Omit<CachedProfile, "playerId" | "fetched_at">
) {
  const fetched_at = new Date().toISOString();
  const payload = { playerId, ...profile, fetched_at };
  await saveFileCache(CACHE_KEYS.profile(playerId), payload);
  const { error } = await supabase.from("classements_externes_api_cache").upsert({
    cache_key: CACHE_KEYS.profile(playerId),
    payload,
    fetched_at,
  });
  if (error) {
    /* fichier local suffit */
  }
}

export async function loadRankingCaches(supabase: SupabaseClient): Promise<RankingCacheMaps> {
  const result: RankingCacheMaps = {
    atp: new Map(),
    wta: new Map(),
    itfJunior: new Map(),
    profiles: new Map(),
    messages: [],
  };

  const { data, error } = await supabase
    .from("classements_externes_api_cache")
    .select("cache_key, payload, fetched_at")
    .order("fetched_at", { ascending: false });

  if (!error && data?.length) {
    for (const row of data) {
      ingestCacheRow(result, row.cache_key as string, row.payload, "Cache DB");
    }
  } else if (error) {
    result.messages.push(`Cache DB indisponible — fichier local`);
  }

  if (!result.atp.size && !result.wta.size && !result.itfJunior.size && !result.profiles.size) {
    const files = await loadAllFileCaches();
    for (const row of files) {
      ingestCacheRow(result, row.cache_key, row.payload, "Cache fichier");
    }
  }

  result.messages.push(`Profils en cache: ${result.profiles.size}`);
  return result;
}

export function profileToHit(profile: CachedProfile) {
  return {
    rang: profile.rang,
    points: profile.points,
    apiPlayerId: profile.playerId,
  };
}

export function extractAndCacheProfile(playerId: string, payload: unknown): CachedProfile | null {
  const parsed = extractProfileRanking(payload);
  if (!parsed) return null;
  return {
    playerId,
    rang: parsed.rang,
    points: parsed.points,
    genre: parsed.genre,
    fetched_at: new Date().toISOString(),
  };
}

export async function loadSyncQueue(): Promise<SyncQueueState> {
  const hit = await loadFileCache(CACHE_KEYS.syncQueue);
  const payload = hit?.payload as SyncQueueState | undefined;
  return payload?.pending_ids ? payload : { pending_ids: [], updated_at: "" };
}

export async function saveSyncQueue(queue: SyncQueueState) {
  await saveFileCache(CACHE_KEYS.syncQueue, queue);
}
