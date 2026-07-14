#!/usr/bin/env node
/**
 * Scrape hebdomadaire classements ATP/WTA — joueurs marocains seniors.
 * ITF Junior : non concerné (RapidAPI / classements_externes).
 *
 * Usage:
 *   node scripts/scrape-classements-maroc.mjs
 *   node scripts/scrape-classements-maroc.mjs --force
 *   node scripts/scrape-classements-maroc.mjs --semaine=2026-06-29 --atp-only
 */
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const force = process.argv.includes("--force");
const atpOnlyFlag = process.argv.includes("--atp-only");
const semaineArg = process.argv.find((a) => a.startsWith("--semaine="))?.slice("--semaine=".length);

const envPath = join(root, ".env.local");
let fileEnv = {};
try {
  fileEnv = Object.fromEntries(
    readFileSync(envPath, "utf8")
      .split(/\r?\n/)
      .filter((l) => l.trim() && !l.trim().startsWith("#"))
      .map((l) => {
        const i = l.indexOf("=");
        return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")];
      })
  );
} catch {
  /* CI : variables d'environnement uniquement */
}
const env = {
  NEXT_PUBLIC_SUPABASE_URL:
    process.env.NEXT_PUBLIC_SUPABASE_URL || fileEnv.NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY:
    process.env.SUPABASE_SERVICE_ROLE_KEY || fileEnv.SUPABASE_SERVICE_ROLE_KEY,
};

import { fetchHtmlWithFallback } from "../lib/classements-maroc-scrapes/fetch-html.mjs";

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

function displayNameForCneJoueur(prenom, nom) {
  return `${prenom ?? ""} ${nom ?? ""}`.replace(/\s+/g, " ").trim();
}

const USER_AGENT = "FRMT-Centre-National/1.0 (+usage-interne; classements-maroc)";
const ATP_URL_BASE =
  "https://www.atptour.com/en/rankings/singles?region=MAR&rankRange=0-5000";
const WTA_API = "https://api.wtatennis.com/tennis/players/ranked";

function atpUrl(dateWeek) {
  if (!dateWeek) return ATP_URL_BASE;
  return `${ATP_URL_BASE}&dateWeek=${encodeURIComponent(dateWeek)}`;
}

function mondayOfWeek(ref = new Date()) {
  const d = new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), ref.getUTCDate()));
  const dow = d.getUTCDay();
  const offset = dow === 0 ? -6 : 1 - dow;
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
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

function normalizeName(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseAtpHtml(html) {
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
    rows.push({
      nom_joueur: resolveAtpDisplayName(slug, playerM[3] ?? ""),
      type_classement: "ATP",
      genre: "M",
      rang: Number(rankM[1]),
      points: pointsRaw ? Number(pointsRaw) : null,
      evolution,
      age: null,
      source_url: atpUrl(),
      source_player_id: slug && code ? `${slug}/${code}` : slug || null,
    });
  }
  return rows;
}

async function fetchAtp(dateWeek) {
  const url = atpUrl(dateWeek);
  const html = await fetchHtmlWithFallback(url, {
    Referer: "https://www.atptour.com/en/rankings/singles",
  });
  return parseAtpHtml(html).map((r) => ({ ...r, source_url: url }));
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchWta(at) {
  const out = [];
  const sourceUrl = at
    ? `https://www.wtatennis.com/rankings/singles?date=${at}`
    : "https://www.wtatennis.com/rankings/singles";
  for (let page = 0; page < 30; page++) {
    const params = new URLSearchParams({
      type: "rankSingles",
      metric: "singles",
      page: String(page),
      pageSize: "100",
    });
    if (at) params.set("at", at);
    const url = `${WTA_API}?${params}`;
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`WTA HTTP ${res.status} page ${page}`);
    const batch = await res.json();
    if (!Array.isArray(batch) || !batch.length) break;
    let maxRank = 0;
    for (const item of batch) {
      const rank = item.ranking ?? 0;
      if (rank > maxRank) maxRank = rank;
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
        source_player_id: item.player?.id != null ? String(item.player.id) : null,
      });
    }
    if (maxRank >= 2500 || batch.length < 100) break;
    await sleep(800);
  }
  return out.sort((a, b) => a.rang - b.rang);
}

function atpSlugFromSourceId(sourcePlayerId) {
  if (!sourcePlayerId) return "";
  return sourcePlayerId.split("/")[0] ?? "";
}

function initialFromAbbreviatedDisplay(display) {
  const m = display.trim().match(/^([A-Za-z])\./);
  return m ? normalizeName(m[1]) : null;
}

function prenomMatchesSlug(prenom, slug) {
  if (!slug) return false;
  const slugFirst = slug.split("-")[0] ?? "";
  if (!slugFirst) return false;
  const parts = normalizeName(prenom ?? "").split(" ").filter(Boolean);
  return parts.some(
    (p) =>
      p === slugFirst ||
      p.startsWith(slugFirst) ||
      slugFirst.startsWith(p.slice(0, Math.min(3, p.length)))
  );
}

function prenomMatchesInitial(prenom, initial) {
  if (!initial) return false;
  const parts = normalizeName(prenom ?? "").split(" ").filter(Boolean);
  return parts.some((p) => p.startsWith(initial) || initial.startsWith(p.charAt(0)));
}

function familyTokensFromDisplay(display) {
  const parts = display
    .replace(/\./g, " ")
    .trim()
    .split(/\s+/)
    .filter((p) => p.length >= 2);
  if (parts.length <= 1) return parts.map((p) => normalizeName(p)).filter(Boolean);
  return parts.slice(1).map((p) => normalizeName(p));
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
    if (key === scrapedNorm || scrapedNorm.includes(key) || key.includes(scrapedNorm)) return true;
  }
  const scrapedFamilies = familyTokensFromDisplay(scrapedName);
  const joueurTokens = normalizeName(`${j.prenom ?? ""} ${j.nom ?? ""}`).split(" ").filter((t) => t.length >= 2);
  const joueurFamilies = joueurTokens.slice(1);
  if (!scrapedFamilies.length || !joueurFamilies.length) return false;
  return scrapedFamilies.some(
    (sf) =>
      sf.length >= 3 &&
      joueurFamilies.some((jf) => jf === sf || jf.startsWith(sf) || sf.startsWith(jf))
  );
}

const ELITE_PRO = "Elite Pro";

function isEligible(j, type) {
  if ((j.categorie_age ?? "").trim() !== ELITE_PRO) return false;
  const sexe = (j.sexe ?? "").toUpperCase();
  if (type === "ATP") return ["M", "H", "HOMME"].includes(sexe);
  return ["F", "FEMME"].includes(sexe);
}

function matchScrapedToCneJoueur(scrapedName, type, joueurs, sourcePlayerId) {
  const slug = atpSlugFromSourceId(sourcePlayerId);
  const candidates = [];
  for (const j of joueurs) {
    if (!isEligible(j, type)) continue;
    if (scrapedMatchesJoueur(scrapedName, j)) candidates.push(j);
  }
  if (!candidates.length) return null;
  if (candidates.length === 1) return candidates[0];
  if (slug) {
    const bySlug = candidates.filter((j) => prenomMatchesSlug(j.prenom, slug));
    if (bySlug.length === 1) return bySlug[0];
  }
  const initial = initialFromAbbreviatedDisplay(scrapedName);
  if (initial) {
    const byInitial = candidates.filter((j) => prenomMatchesInitial(j.prenom, initial));
    if (byInitial.length === 1) return byInitial[0];
  }
  return null;
}

function matchCne(rows, joueurs) {
  return rows.map((row) => {
    const hit = matchScrapedToCneJoueur(
      row.nom_joueur,
      row.type_classement,
      joueurs,
      row.source_player_id
    );
    return {
      ...row,
      nom_joueur: hit
        ? displayNameForCneJoueur(hit.prenom, hit.nom) || row.nom_joueur
        : row.nom_joueur,
      joueur_cne_id: hit?.id ?? null,
      est_membre_cne: Boolean(hit),
    };
  });
}

async function main() {
  const currentMonday = mondayOfWeek();
  const semaine = semaineArg || currentMonday;
  const atpOnly = atpOnlyFlag;
  const wtaOnly = process.argv.includes("--wta-only");
  const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  if (!force) {
    const { count } = await admin
      .from("classements_maroc_scrapes")
      .select("id", { count: "exact", head: true })
      .eq("semaine_releve", semaine);
    if ((count ?? 0) > 0) {
      console.log(`Skip: relevé déjà présent pour ${semaine} (utilisez --force)`);
      process.exit(0);
    }
  }

  const { data: joueurs } = await admin
    .from("joueurs")
    .select("id, prenom, nom, sexe, categorie_age")
    .or("statut.is.null,statut.eq.actif");

  let atp = [];
  let wta = [];
  if (!wtaOnly) {
    console.log(`Fetch ATP semaine ${semaine}…`);
    atp = await fetchAtp(semaine);
  }
  if (!atpOnly) {
    console.log(`Fetch WTA at=${semaine}…`);
    wta = await fetchWta(semaine);
  } else {
    console.log("WTA ignoré (--atp-only)");
  }
  const nowIso = new Date().toISOString();
  const payload = matchCne([...atp, ...wta], joueurs ?? []).map((r) => ({
    ...r,
    semaine_releve: semaine,
    date_releve: nowIso,
  }));

  if (!payload.length) {
    console.error("Aucun joueur trouvé");
    process.exit(1);
  }

  if (force) {
    if (atpOnly) {
      const { error: delErr } = await admin
        .from("classements_maroc_scrapes")
        .delete()
        .eq("semaine_releve", semaine)
        .eq("type_classement", "ATP");
      if (delErr) {
        console.error(delErr.message);
        process.exit(1);
      }
    } else {
      const { error: delErr } = await admin
        .from("classements_maroc_scrapes")
        .delete()
        .eq("semaine_releve", semaine);
      if (delErr) {
        console.error(delErr.message);
        process.exit(1);
      }
    }
  }

  const { error } = await admin.from("classements_maroc_scrapes").insert(payload);
  if (error) {
    console.error(error.message);
    process.exit(1);
  }

  console.log(`OK: ${payload.length} lignes (ATP ${atp.length}, WTA ${wta.length}) semaine ${semaine}`);
  const matched = payload.filter((r) => r.est_membre_cne);
  console.log(`CNE matchés: ${matched.length}`);
  for (const r of matched) {
    console.log(`  - ${r.nom_joueur} ${r.type_classement} #${r.rang}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
