/**
 * Bootstrap cache fichier ATP/WTA + sync locale (sans passer par Next.js).
 * Usage: node scripts/bootstrap-ranking-cache.mjs
 *        node scripts/bootstrap-ranking-cache.mjs --sync-only  (0 appel API)
 */
import { readFileSync, mkdirSync, writeFileSync, readdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const cacheDir = join(root, "data", "classements-externes", "cache");
const syncOnly = process.argv.includes("--sync-only");

const env = Object.fromEntries(
  readFileSync(join(root, ".env.local"), "utf8")
    .split(/\r?\n/)
    .filter((l) => l.trim() && !l.trim().startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")];
    })
);

const host = env.RAPIDAPI_HOST || "tennisapi1.p.rapidapi.com";
const key = env.RAPIDAPI_KEY;
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const ELITE_PRO = "Elite Pro";
const JUNIOR_CODES = new Set(["U8", "U10", "U12", "U14", "U16", "U18"]);

function normSexe(sexe) {
  return (sexe ?? "").trim().toUpperCase();
}

function isHomme(sexe) {
  const s = normSexe(sexe);
  return s === "M" || s === "H" || s === "HOMME";
}

function isFemme(sexe) {
  const s = normSexe(sexe);
  return s === "F" || s === "FEMME";
}

function classementCible(j) {
  const cat = (j.categorie_age ?? "").trim();
  if (cat === ELITE_PRO) {
    if (isHomme(j.sexe)) return "ATP";
    if (isFemme(j.sexe)) return "WTA";
    return null;
  }
  if (JUNIOR_CODES.has(cat)) {
    if (!isHomme(j.sexe) && !isFemme(j.sexe)) return null;
    return "ITF Junior";
  }
  return null;
}

function normalizeName(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function nameKeys(prenom, nom) {
  const p = prenom.trim().replace(/\s+/g, " ");
  const n = nom.trim().replace(/\s+/g, " ");
  const nomParts = n.split(" ").filter((t) => t.length >= 2);
  const keys = new Set();
  keys.add(normalizeName(`${p} ${n}`));
  keys.add(normalizeName(`${n} ${p}`));
  if (p && nomParts[0]) keys.add(normalizeName(`${p} ${nomParts[0]}`));
  return [...keys].filter(Boolean);
}

function nameTokens(value) {
  return normalizeName(value).split(" ").filter((t) => t.length >= 2);
}

function findInMap(prenom, nom, map) {
  for (const k of nameKeys(prenom, nom)) {
    if (map.has(k)) return map.get(k);
  }
  const tokens = nameTokens(`${prenom} ${nom}`);
  for (const [key, hit] of map) {
    const ct = key.split(" ").filter(Boolean);
    const fn = tokens[0] ?? "";
    const nomT = tokens.slice(1);
    const fnOk = !fn || ct.some((t) => t === fn || t.startsWith(fn.slice(0, 3)));
    if (!fnOk) continue;
    if (nomT.some((t) => t.length >= 3 && ct.includes(t))) return hit;
  }
  return null;
}

function rowsToMap(payload) {
  const list = Array.isArray(payload?.rankings) ? payload.rankings : [];
  const map = new Map();
  for (const row of list) {
    const name = row.rowName || row.team?.name;
    const position = row.ranking ?? row.position;
    if (!name || position == null) continue;
    const k = normalizeName(name);
    if (!k || map.has(k)) continue;
    map.set(k, {
      rang: position,
      points: row.points ?? null,
      apiPlayerId: row.team?.id != null ? String(row.team.id) : null,
    });
  }
  return map;
}

function saveCache(cacheKey, payload) {
  mkdirSync(cacheDir, { recursive: true });
  const path = join(cacheDir, `${cacheKey.replace(/:/g, "_")}.json`);
  writeFileSync(
    path,
    JSON.stringify({ cache_key: cacheKey, payload, fetched_at: new Date().toISOString() }),
    "utf8"
  );
  return path;
}

function loadCache(cacheKey) {
  const path = join(cacheDir, `${cacheKey.replace(/:/g, "_")}.json`);
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8")).payload;
}

async function rapidGet(path) {
  const res = await fetch(`https://${host}${path}`, {
    headers: { "x-rapidapi-key": key, "x-rapidapi-host": host },
  });
  return { status: res.status, json: res.ok ? await res.json() : await res.text() };
}

async function main() {
  let apiCalls = 0;

  if (!syncOnly) {
    for (const tour of ["atp", "wta"]) {
      const r = await rapidGet(`/api/tennis/rankings/${tour}`);
      apiCalls++;
      if (r.status !== 200) {
        console.error(`${tour} HTTP`, r.status, typeof r.json === "string" ? r.json.slice(0, 120) : r.json);
        process.exit(1);
      }
      const p = saveCache(`${tour}_rankings`, r.json);
      console.log(`Saved ${tour}:`, r.json.rankings?.length, "rows ->", p);
    }
  }

  const atpMap = rowsToMap(loadCache("atp_rankings"));
  const wtaMap = rowsToMap(loadCache("wta_rankings"));
  console.log("Cache maps:", "ATP", atpMap.size, "WTA", wtaMap.size);

  const { data: joueurs } = await admin
    .from("joueurs")
    .select("id, nom, prenom, sexe, categorie_age")
    .or("statut.is.null,statut.eq.actif");

  const now = new Date().toISOString();
  let sync = 0;
  let miss = 0;
  let ignores = 0;
  const byCible = { ATP: { ok: 0, miss: 0 }, WTA: { ok: 0, miss: 0 }, "ITF Junior": { ok: 0, miss: 0 } };

  for (const j of joueurs ?? []) {
    const prenom = (j.prenom ?? "").replace(/\s+/g, " ").trim();
    const nom = (j.nom ?? "").replace(/\s+/g, " ").trim();
    const cible = classementCible(j);
    if (!cible) {
      ignores++;
      continue;
    }
    if (cible === "ITF Junior") {
      byCible["ITF Junior"].miss++;
      miss++;
      continue;
    }

    const map = cible === "ATP" ? atpMap : wtaMap;
    const hit = findInMap(prenom, nom, map);

    if (!hit) {
      byCible[cible].miss++;
      miss++;
      continue;
    }

    const { error } = await admin.from("classements_externes").upsert(
      {
        joueur_id: j.id,
        nom_joueur: `${prenom} ${nom}`.trim(),
        categorie: cible,
        rang: hit.rang,
        points: hit.points,
        date_maj: now,
        source: "rapidapi-cache-local",
      },
      { onConflict: "joueur_id,categorie" }
    );
    if (error) console.error("upsert", prenom, nom, error.message);
    else {
      sync++;
      byCible[cible].ok++;
      console.log("OK", cible, hit.rang, prenom, nom);
    }
  }

  console.log(
    `Done: ${sync} synced, ${miss} not in top-500 cache, ${ignores} ignored (hors Elite/U8–U18), ${apiCalls} API call(s)`
  );
  console.log(
    `ATP ${byCible.ATP.ok}/${byCible.ATP.ok + byCible.ATP.miss} · WTA ${byCible.WTA.ok}/${byCible.WTA.ok + byCible.WTA.miss} · ITF skip ${byCible["ITF Junior"].miss}`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
