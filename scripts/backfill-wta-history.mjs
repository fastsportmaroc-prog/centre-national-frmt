#!/usr/bin/env node
/**
 * Backfill WTA Maroc historique via API at=YYYY-MM-DD
 * (équivalent site : https://www.wtatennis.com/rankings/singles?date=…)
 *
 * Usage:
 *   node scripts/backfill-wta-history.mjs
 *   node scripts/backfill-wta-history.mjs --force
 */
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const force = process.argv.includes("--force");

const env = Object.fromEntries(
  readFileSync(join(root, ".env.local"), "utf8")
    .split(/\r?\n/)
    .filter((l) => l.trim() && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")];
    })
);

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const USER_AGENT = "FRMT-Centre-National/1.0 (+usage-interne; classements-maroc)";
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

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
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
    if (key === scrapedNorm || scrapedNorm.includes(key) || key.includes(scrapedNorm)) return true;
  }
  return false;
}

function isEligible(j) {
  if ((j.categorie_age ?? "").trim() !== "Elite Pro") return false;
  const sexe = (j.sexe ?? "").toUpperCase();
  return ["F", "FEMME"].includes(sexe);
}

function matchCne(rows, joueurs) {
  return rows.map((row) => {
    const hit = joueurs.find((j) => isEligible(j) && scrapedMatchesJoueur(row.nom_joueur, j));
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

async function fetchWtaAt(at) {
  const out = [];
  let rankedAt = null;
  const sourceUrl = `https://www.wtatennis.com/rankings/singles?date=${at}`;
  for (let page = 0; page < 30; page++) {
    const params = new URLSearchParams({
      type: "rankSingles",
      metric: "singles",
      page: String(page),
      pageSize: "100",
      at,
    });
    const res = await fetch(`https://api.wtatennis.com/tennis/players/ranked?${params}`, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`WTA HTTP ${res.status} page ${page}`);
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
        source_player_id: item.player?.id != null ? String(item.player.id) : null,
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
    .eq("type_classement", "WTA");

  if ((count ?? 0) > 0 && !force) {
    console.log(`Skip ${semaine} — WTA déjà présent`);
    continue;
  }

  console.log(`\nFetch WTA at=${semaine}…`);
  const { rows, rankedAt } = await fetchWtaAt(semaine);
  console.log(`  rankedAt=${rankedAt} | ${rows.length} MAR`);

  if (!rows.length) {
    console.log("  (vide)");
    continue;
  }

  // Si l’API mappe vers un autre lundi (ex. 07-06 → 06-29), stocker sous rankedAt
  // sauf si on a demandé explicitement une semaine déjà dans la liste.
  const storeWeek = rankedAt && rankedAt !== semaine && !WEEKS.includes(semaine) ? rankedAt : semaine;

  if (force || (count ?? 0) > 0) {
    await admin
      .from("classements_maroc_scrapes")
      .delete()
      .eq("semaine_releve", storeWeek)
      .eq("type_classement", "WTA");
  } else {
    // Si on stocke sous storeWeek et qu’il a déjà WTA, skip
    if (storeWeek !== semaine) {
      const { count: c2 } = await admin
        .from("classements_maroc_scrapes")
        .select("id", { count: "exact", head: true })
        .eq("semaine_releve", storeWeek)
        .eq("type_classement", "WTA");
      if ((c2 ?? 0) > 0) {
        console.log(`  Skip — WTA déjà sur ${storeWeek}`);
        continue;
      }
    }
  }

  const nowIso = new Date().toISOString();
  const payload = matchCne(rows, joueurs ?? []).map((r) => ({
    ...r,
    semaine_releve: storeWeek,
    date_releve: nowIso,
  }));

  const { error } = await admin.from("classements_maroc_scrapes").insert(payload);
  if (error) {
    console.error("  ERR", error.message);
    continue;
  }
  for (const r of payload) {
    console.log(
      `  → ${r.nom_joueur} #${r.rang} CNE=${r.est_membre_cne} (semaine ${storeWeek})`
    );
  }
}

console.log("\nDone.");
