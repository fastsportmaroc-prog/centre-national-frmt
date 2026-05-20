#!/usr/bin/env node
/**
 * Import top 5 FRMT par année de naissance et sexe depuis
 * https://info.frmt.ma/FRMT_CLASSEMENT_WB27
 *
 * Usage: npm run import:frmt-classement
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "data", "frmt", "classement-top5.json");
const URL = "https://info.frmt.ma/FRMT_CLASSEMENT_WB27";

const BIRTH_YEAR_MIN = 2005;
const BIRTH_YEAR_MAX = 2015;

const GENDERS = [
  { value: "1", sexe: "M", label: "Garçons" },
  { value: "2", sexe: "F", label: "Filles" },
];

function categorieFromBirthYear(year) {
  if (year >= 2014) return "U12";
  if (year >= 2012) return "U14";
  if (year >= 2010) return "U16";
  return "U18";
}

function inBirthScope(year) {
  return year >= BIRTH_YEAR_MIN && year <= BIRTH_YEAR_MAX;
}

function splitName(full) {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { nom: "?", prenom: "?" };
  if (parts.length === 1) return { nom: parts[0], prenom: "—" };
  return { prenom: parts[parts.length - 1], nom: parts.slice(0, -1).join(" ") };
}

function parsePoints(s) {
  return Number(String(s).replace(/\s/g, "").replace(",", ".")) || 0;
}

/** Lit les options année de naissance du site (ex. « 2014 (12 ans) » → value 4) */
async function discoverBirthFilters(page) {
  return page.evaluate(() => {
    const out = [];
    for (const sel of document.querySelectorAll("select")) {
      const opts = Array.from(sel.options);
      const hasAge = opts.some((o) => /\(\d+\s*ans\)/i.test(o.textContent || ""));
      if (!hasAge) continue;
      for (const o of opts) {
        const text = (o.textContent || "").trim();
        const m = text.match(/^(\d{4})\s*\(/);
        if (m) out.push({ value: o.value, birthYear: Number(m[1]), label: text });
      }
      break;
    }
    return out;
  });
}

async function getClassementDate(page) {
  return page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input[type="text"], input:not([type])'));
    for (const el of inputs) {
      const v = (el.value || "").trim();
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(v)) return v;
    }
    return null;
  });
}

async function extractTable(page) {
  return page.evaluate(() => {
    const rows = [];
    const seen = new Set();
    const re = /(\d+)\s+([+-]?\d+(?:[,.]\d+)?)?\s+(.+?)\s+\[(\d{4})\]\s+\(([^)]+)\)/;

    const texts = new Set([document.body.innerText || ""]);
    for (const el of document.querySelectorAll("td, span, div, label")) {
      const t = (el.textContent || "").trim();
      if (t.includes("[") && /\[\d{4}\]/.test(t) && t.length < 200) texts.add(t);
    }

    for (const blob of texts) {
      for (const line of blob.split("\n")) {
        const m = line.match(re);
        if (!m) continue;
        const key = `${m[1]}|${m[4]}|${m[3]}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const pts =
          line.match(/([\d]+[,.][\d]+)\s*Points?/i) ||
          line.match(/\s([\d]+[,.][\d]+)\s*$/);
        const variation = m[2] ? parseFloat(String(m[2]).replace(",", ".")) : null;
        rows.push({
          rank: Number(m[1]),
          variation_clt: variation,
          name: m[3].trim(),
          year: Number(m[4]),
          club: m[5].trim(),
          points: pts ? pts[1] : "0",
          line,
        });
      }
    }
    return rows;
  });
}

async function selectTranche(page, value) {
  await page.locator("select").evaluateAll((selects, val) => {
    for (const sel of selects) {
      const opts = Array.from(sel.options).map((o) => o.textContent || "");
      if (opts.some((t) => /^Top\s*100/i.test(t) || /101-200/.test(t))) {
        sel.value = val;
        sel.dispatchEvent(new Event("change", { bubbles: true }));
        return;
      }
    }
  }, value);
}

async function selectBirthYear(page, value) {
  await page.locator("select").evaluateAll((selects, val) => {
    for (const sel of selects) {
      const opts = Array.from(sel.options).map((o) => o.textContent || "");
      if (opts.some((t) => /\(\d+\s*ans\)/i.test(t) || t.includes("Tous"))) {
        sel.value = val;
        sel.dispatchEvent(new Event("change", { bubbles: true }));
        return;
      }
    }
  }, value);
}

async function selectGender(page, value) {
  await page.locator("select").evaluateAll((selects, val) => {
    for (const sel of selects) {
      const opts = Array.from(sel.options).map((o) => o.textContent || "");
      if (opts.some((t) => t.includes("Garçons") || t.includes("Filles"))) {
        sel.value = val;
        sel.dispatchEvent(new Event("change", { bubbles: true }));
        return;
      }
    }
  }, value);
}

async function clickActualiser(page) {
  const btn = page.getByRole("button", { name: /actualiser/i }).first();
  if (await btn.count()) await btn.click();
  else
    await page
      .locator('img[src*="actualiser"], input[src*="actualiser"]')
      .first()
      .click({ timeout: 5000 })
      .catch(() => {});
  await page.waitForTimeout(2800);
}

function pushPlayers(all, seen, rows, sexe, filterLabel, expectedYear) {
  const filtered = rows
    .filter((r) => r.year === expectedYear)
    .sort((a, b) => parsePoints(b.points) - parsePoints(a.points))
    .slice(0, 5);

  for (let i = 0; i < filtered.length; i++) {
    const r = filtered[i];
    const { nom, prenom } = splitName(r.name);
    const key = `${r.year}|${sexe}|${nom}|${prenom}`;
    if (seen.has(key)) continue;
    seen.add(key);
    all.push({
      classement_national: r.rank,
      variation: r.variation_clt ?? null,
      points: parsePoints(r.points),
      nom,
      prenom,
      annee_naissance: r.year,
      club: r.club,
      sexe,
      categorie_age: categorieFromBirthYear(r.year),
      rang_categorie: i + 1,
      frmt_filter: filterLabel,
    });
  }
  return filtered.length;
}

async function fetchTop5ForFilter(page, birth, g) {
  const filterLabel = `${birth.birthYear}-${g.sexe}`;
  let merged = [];
  const tranches = ["1", "2", "3", "4", "5", "6", "7", "8"];

  for (const tr of tranches) {
    await selectBirthYear(page, birth.value);
    await selectGender(page, g.value);
    await selectTranche(page, tr);
    await clickActualiser(page);
    const rows = await extractTable(page);
    merged = merged.concat(rows.filter((r) => r.year === birth.birthYear));
    const uniq = new Map();
    for (const r of merged) {
      const k = `${r.name}|${r.year}`;
      const prev = uniq.get(k);
      if (!prev || parsePoints(r.points) > parsePoints(prev.points)) uniq.set(k, r);
    }
    merged = [...uniq.values()];
    if (merged.length >= 5) break;
  }

  return { filterLabel, rows: merged };
}

async function main() {
  let chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch {
    console.error(
      "Installez Playwright: npm install -D playwright && npx playwright install chromium"
    );
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const all = [];
  const seen = new Set();
  const errors = [];
  let classementDate = null;

  try {
    await page.goto(URL, { waitUntil: "networkidle", timeout: 90000 });
    await page.waitForTimeout(3000);
    classementDate = await getClassementDate(page);

    const discovered = await discoverBirthFilters(page);
    const birthFilters = discovered.filter(
      (b) => b.birthYear >= BIRTH_YEAR_MIN && b.birthYear <= BIRTH_YEAR_MAX
    );
    console.log(
      "Filtres année découverts:",
      birthFilters.map((b) => `${b.birthYear}=${b.value}`).join(", ")
    );

    for (const birth of birthFilters) {
      for (const g of GENDERS) {
        try {
          const { filterLabel, rows } = await fetchTop5ForFilter(page, birth, g);
          const n = pushPlayers(all, seen, rows, g.sexe, filterLabel, birth.birthYear);
          console.log(`OK ${filterLabel}: ${n} joueurs`);
        } catch (e) {
          errors.push(`${birth.birthYear}-${g.sexe}: ${e.message}`);
        }
      }
    }

    /** Années 2005–2007 absentes du menu : filtre « Tous » puis top 5 par année */
    const missingYears = [2005, 2006, 2007].filter((y) =>
      !birthFilters.some((b) => b.birthYear === y)
    );
    if (missingYears.length) {
      for (const g of GENDERS) {
        try {
          await selectBirthYear(page, "1");
          await selectGender(page, g.value);
          await clickActualiser(page);
          const rows = await extractTable(page);
          for (const year of missingYears) {
            const filterLabel = `${year}-${g.sexe}`;
            const n = pushPlayers(all, seen, rows, g.sexe, filterLabel, year);
            console.log(`OK ${filterLabel} (Tous): ${n} joueurs`);
          }
        } catch (e) {
          errors.push(`Tous-${g.sexe}: ${e.message}`);
        }
      }
    }
  } finally {
    await browser.close();
  }

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  const scoped = all.filter((p) => inBirthScope(p.annee_naissance));
  const payload = {
    source: URL,
    fetchedAt: new Date().toISOString(),
    classementDate,
    birthYearMin: BIRTH_YEAR_MIN,
    birthYearMax: BIRTH_YEAR_MAX,
    note: `Top 5 garçons/filles isolés par année de naissance ${BIRTH_YEAR_MIN}–${BIRTH_YEAR_MAX} (source WB27)`,
    players: scoped,
  };
  fs.writeFileSync(OUT, JSON.stringify(payload, null, 2), "utf8");
  console.log(JSON.stringify({ count: scoped.length, path: OUT, errors }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
