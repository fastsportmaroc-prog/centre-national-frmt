#!/usr/bin/env node
/**
 * Backfill classements doubles ATP/WTA Maroc (4 mai → 13 juillet 2026).
 * Stockage : source_player_id se termine par #D (coexiste avec le simple, sans migration).
 *
 * Usage:
 *   node scripts/backfill-doubles-history.mjs
 *   node scripts/backfill-doubles-history.mjs --force
 */
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import { fetchHtmlWithFallback } from "../lib/classements-maroc-scrapes/fetch-html.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const force = process.argv.includes("--force");

function loadEnv() {
  const envPath = join(root, ".env.local");
  const out = {};
  if (!existsSync(envPath)) return out;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 1) continue;
    let val = t.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[t.slice(0, i).trim()] = val;
  }
  return out;
}

const env = loadEnv();
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const USER_AGENT = "FRMT-Centre-National/1.0 (+usage-interne; classements-maroc)";
const SUFFIX = "#D";
const WEEKS = [
  "2026-05-04",
  "2026-05-18",
  "2026-05-25",
  "2026-06-08",
  "2026-06-15",
  "2026-06-22",
  "2026-06-29",
  "2026-07-13",
];
const ELITE_PRO = "Elite Pro";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function withDoubleSuffix(id) {
  if (!id) return null;
  return id.endsWith(SUFFIX) ? id : `${id}${SUFFIX}`;
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

function displayNameFromAtpSlug(slug) {
  return slug
    .split("-")
    .filter((part) => part.length > 0)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function resolveAtpDisplayName(slug, htmlName) {
  const fromSlug = slug ? displayNameFromAtpSlug(slug) : "";
  const trimmed = htmlName.replace(/\s+/g, " ").trim();
  if (fromSlug && fromSlug.length > trimmed.length) return fromSlug;
  return trimmed || fromSlug;
}

function ageFromBirthDate(iso) {
  if (!iso || String(iso).startsWith("1753")) return null;
  const born = new Date(iso);
  if (Number.isNaN(born.getTime())) return null;
  const now = new Date();
  let age = now.getUTCFullYear() - born.getUTCFullYear();
  const m = now.getUTCMonth() - born.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < born.getUTCDate())) age--;
  return age >= 0 && age < 120 ? age : null;
}

function joueurKeys(j) {
  const p = (j.prenom ?? "").trim();
  const n = (j.nom ?? "").trim();
  const keys = new Set();
  const full = normalizeName(`${p} ${n}`);
  if (full) keys.add(full);
  const nomParts = n.split(/\s+/).filter((t) => t.length >= 2);
  if (p && nomParts[0]) keys.add(normalizeName(`${p} ${nomParts[0]}`));
  return [...keys];
}

function scrapedMatchesJoueur(scrapedName, j) {
  const scrapedNorm = normalizeName(scrapedName);
  if (!scrapedNorm) return false;
  for (const key of joueurKeys(j)) {
    if (key === scrapedNorm || scrapedNorm.includes(key) || key.includes(scrapedNorm)) {
      return true;
    }
  }
  const scrapedFamilies = scrapedName
    .replace(/\./g, " ")
    .trim()
    .split(/\s+/)
    .filter((p) => p.length >= 2)
    .slice(1)
    .map((p) => normalizeName(p));
  const joueurTokens = normalizeName(`${j.prenom ?? ""} ${j.nom ?? ""}`)
    .split(" ")
    .filter((t) => t.length >= 2);
  const joueurFamilies = joueurTokens.slice(1);
  if (!scrapedFamilies.length || !joueurFamilies.length) return false;
  return scrapedFamilies.some(
    (sf) =>
      sf.length >= 3 &&
      joueurFamilies.some((jf) => jf === sf || jf.startsWith(sf) || sf.startsWith(jf))
  );
}

function isEligible(j, type) {
  if ((j.categorie_age ?? "").trim() !== ELITE_PRO) return false;
  const sexe = (j.sexe ?? "").toUpperCase();
  if (type === "ATP") return ["M", "H", "HOMME"].includes(sexe);
  return ["F", "FEMME"].includes(sexe);
}

function matchCne(rows, joueurs) {
  return rows.map((row) => {
    const hit = joueurs.find(
      (j) => isEligible(j, row.type_classement) && scrapedMatchesJoueur(row.nom_joueur, j)
    );
    return {
      ...row,
      nom_joueur: hit
        ? `${hit.prenom ?? ""} ${hit.nom ?? ""}`.replace(/\s+/g, " ").trim() || row.nom_joueur
        : row.nom_joueur,
      joueur_cne_id: hit?.id ?? null,
      est_membre_cne: Boolean(hit),
    };
  });
}

function parseAtpDoublesHtml(html, sourceUrl) {
  const rows = [];
  const trRe = /<tr class="lower-row">([\s\S]*?)<\/tr>/gi;
  let m;
  while ((m = trRe.exec(html)) !== null) {
    const block = m[1] ?? "";
    const rankM = block.match(/<td class="rank[^"]*"[^>]*>\s*(\d+)\s*<\/td>/);
    const playerM = block.match(
      /href="\/en\/players\/([^/]+)\/([^/]+)\/overview"[\s\S]*?<span class="lastName">([^<]+)<\/span>/
    );
    const pointsM = block.match(/class="points[^"]*"[\s\S]*?<a[^>]*>\s*([\d,]+)\s*<\/a>/);
    if (!rankM || !playerM) continue;
    let evolution = null;
    if (block.includes("rank-up")) {
      const em = block.match(/rank-up">(\d+)/);
      if (em) evolution = Number(em[1]);
    } else if (block.includes("rank-down")) {
      const em = block.match(/rank-down">(\d+)/);
      if (em) evolution = -Number(em[1]);
    } else if (block.includes("rank-same") || block.includes("icon-minus")) {
      evolution = 0;
    }
    const slug = playerM[1] ?? "";
    const code = playerM[2] ?? "";
    const pointsRaw = (pointsM?.[1] ?? "").replace(/,/g, "");
    const baseId = slug && code ? `${slug}/${code}` : slug || null;
    rows.push({
      nom_joueur: resolveAtpDisplayName(slug, playerM[3] ?? ""),
      type_classement: "ATP",
      genre: "M",
      rang: Number(rankM[1]),
      points: pointsRaw ? Number(pointsRaw) : null,
      evolution,
      age: null,
      source_url: sourceUrl,
      source_player_id: withDoubleSuffix(baseId),
    });
  }
  return rows;
}

async function fetchAtpDoubles(semaine) {
  const url = `https://www.atptour.com/en/rankings/doubles?region=MAR&rankRange=0-5000&dateWeek=${semaine}`;
  const html = await fetchHtmlWithFallback(url, {
    Referer: "https://www.atptour.com/en/rankings/doubles",
  });
  return parseAtpDoublesHtml(html, url);
}

async function fetchWtaDoubles(at) {
  const out = [];
  const sourceUrl = `https://www.wtatennis.com/rankings/doubles?date=${at}`;
  let rankedAt = null;
  for (let page = 0; page < 30; page++) {
    const params = new URLSearchParams({
      type: "rankDoubles",
      metric: "doubles",
      page: String(page),
      pageSize: "100",
      at,
    });
    const res = await fetch(`https://api.wtatennis.com/tennis/players/ranked?${params}`, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`WTA doubles HTTP ${res.status} page ${page}`);
    const batch = await res.json();
    if (!Array.isArray(batch) || !batch.length) break;
    let maxRank = 0;
    for (const item of batch) {
      const rank = item.ranking ?? 0;
      if (rank > maxRank) maxRank = rank;
      if (!rankedAt && item.rankedAt) rankedAt = String(item.rankedAt).slice(0, 10);
      if (item.player?.countryCode !== "MAR") continue;
      const name = (item.player?.fullName ?? "").trim();
      if (!name || rank <= 0) continue;
      out.push({
        nom_joueur: name,
        type_classement: "WTA",
        genre: "F",
        rang: rank,
        points: typeof item.points === "number" ? item.points : null,
        evolution: typeof item.movement === "number" ? item.movement : null,
        age: ageFromBirthDate(item.player?.dateOfBirth),
        source_url: sourceUrl,
        source_player_id: withDoubleSuffix(
          item.player?.id != null ? String(item.player.id) : null
        ),
      });
    }
    if (maxRank >= 2500 || batch.length < 100) break;
    await sleep(700);
  }
  return { rows: out.sort((a, b) => a.rang - b.rang), rankedAt };
}

const { data: joueurs } = await admin
  .from("joueurs")
  .select("id, prenom, nom, sexe, categorie_age")
  .or("statut.is.null,statut.eq.actif");

for (const semaine of WEEKS) {
  const { count } = await admin
    .from("classements_maroc_scrapes")
    .select("id", { count: "exact", head: true })
    .eq("semaine_releve", semaine)
    .like("source_player_id", "%#D");

  if ((count ?? 0) > 0 && !force) {
    console.log(`Skip ${semaine} — doubles déjà présents (${count})`);
    continue;
  }

  console.log(`\n=== ${semaine} ===`);
  let atp = [];
  let wta = [];
  try {
    console.log("  ATP doubles…");
    atp = await fetchAtpDoubles(semaine);
    console.log(`  ATP : ${atp.length}`);
  } catch (e) {
    console.error("  ATP ERR", e.message);
    await sleep(5000);
  }

  try {
    console.log("  WTA doubles…");
    const w = await fetchWtaDoubles(semaine);
    wta = w.rows;
    console.log(`  WTA : ${wta.length} (rankedAt=${w.rankedAt})`);
  } catch (e) {
    console.error("  WTA ERR", e.message);
  }

  const nowIso = new Date().toISOString();
  const payload = matchCne([...atp, ...wta], joueurs ?? []).map((r) => ({
    ...r,
    semaine_releve: semaine,
    date_releve: nowIso,
  }));

  if (!payload.length) {
    console.log("  (vide)");
    continue;
  }

  if (force || (count ?? 0) > 0) {
    const { error: delErr } = await admin
      .from("classements_maroc_scrapes")
      .delete()
      .eq("semaine_releve", semaine)
      .like("source_player_id", "%#D");
    if (delErr) {
      console.error("  DEL", delErr.message);
      continue;
    }
  }

  const { error } = await admin.from("classements_maroc_scrapes").insert(payload);
  if (error) {
    console.error("  INSERT", error.message);
    continue;
  }

  for (const r of payload) {
    console.log(
      `  → ${r.type_classement} #${r.rang} ${r.nom_joueur} CNE=${r.est_membre_cne}`
    );
  }
  await sleep(2000);
}

console.log("\nDone.");
