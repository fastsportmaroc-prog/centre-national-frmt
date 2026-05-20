#!/usr/bin/env node
/**
 * Import top 5 FRMT par année de naissance et sexe depuis
 * https://info.frmt.ma/FRMT_CLASSEMENT_WB27
 *
 * Usage:
 *   npm run import:frmt-classement
 *   node scripts/import-frmt-classement.mjs --debug
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "data", "frmt", "classement-top5.json");
const DEBUG_DIR = path.join(ROOT, "data", "frmt", "debug");
const URL = "https://info.frmt.ma/FRMT_CLASSEMENT_WB27";

const DEBUG = process.argv.includes("--debug");
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

function decodeHtmlEntities(s) {
  return s
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

const NAME_LINE_RE = /(.+?)\s*\[(\d{4})\]\s*\(([^)]+)\)/;

/** Parse joueurs depuis texte brut (innerText, AJAX, HTML) */
function parsePlayersFromText(text, expectedYear = null) {
  if (!text || text.length < 20) return [];
  const decoded = decodeHtmlEntities(text);
  const compact = decoded.replace(/\s+/g, " ");
  const rows = [];
  const seen = new Set();

  const fullLineRe =
    /(\d{1,4})\s+([+-]?\d+(?:[,.]\d+)?)\s+([\p{L}][\p{L}\s.'-]{2,}?)\s*\[(\d{4})\]\s*\(([^)]+)\)[\s\S]{0,60}?(\d+[,.]\d+)/giu;

  let m;
  while ((m = fullLineRe.exec(compact)) !== null) {
    addParsedRow(rows, seen, m[1], m[2], m[3], m[4], m[5], m[6], expectedYear);
  }

  const nameRe = /([\p{L}][\p{L}\s.'-]{2,}?)\s*\[(\d{4})\]\s*\(([^)]+)\)/giu;
  while ((m = nameRe.exec(compact)) !== null) {
    const before = compact.slice(Math.max(0, m.index - 100), m.index);
    const after = compact.slice(m.index + m[0].length, m.index + m[0].length + 50);
    const rankM = before.match(/(\d{1,4})\s+([+-]?\d+(?:[,.]\d+)?)\s*$/);
    const ptsM = after.match(/(\d+[,.]\d+)/);
    addParsedRow(
      rows,
      seen,
      rankM?.[1] ?? null,
      rankM?.[2] ?? null,
      m[1],
      m[2],
      m[3],
      ptsM?.[1] ?? null,
      expectedYear
    );
  }

  for (const vm of decoded.matchAll(/value="([^"]*\[\d{4}\][^"]*)"/gi)) {
    const inner = vm[1];
    const nm = inner.match(NAME_LINE_RE);
    if (!nm) continue;
    addParsedRow(rows, seen, null, null, nm[1], nm[2], nm[3], null, expectedYear);
  }

  return rows;
}

function addParsedRow(rows, seen, rank, variation, name, year, club, points, expectedYear) {
  const y = Number(year);
  if (expectedYear && y !== expectedYear) return;
  const n = String(name).trim();
  const c = String(club).trim();
  const key = `${y}|${n}|${c}`;
  if (seen.has(key)) return;
  seen.add(key);
  rows.push({
    rank: rank ? Number(rank) : 9999,
    variation_clt: variation ? parseFloat(String(variation).replace(",", ".")) : null,
    name: n,
    year: y,
    club: c,
    points: points ? String(points) : "0",
  });
}

/** Extraction WinDev : cellules dans <input value="..."> */
function parseFromInputValues(values, expectedYear = null) {
  const rows = [];
  const seen = new Set();

  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    const nm = v.match(NAME_LINE_RE);
    if (!nm) continue;

    const name = nm[1].trim();
    const year = Number(nm[2]);
    const club = nm[3].trim();
    if (expectedYear && year !== expectedYear) continue;

    let rank = null;
    let variation = null;
    let points = null;

    for (let j = i + 1; j < Math.min(values.length, i + 10); j++) {
      const x = values[j];
      if (!points && /^[\d]+[,.][\d]+$/.test(x)) {
        points = x;
        break;
      }
    }
    for (let j = i - 1; j >= Math.max(0, i - 10); j--) {
      const x = values[j];
      if (!variation && /^[+-]?\d+([,.][\d]+)?$/.test(x)) {
        variation = x;
        continue;
      }
      if (!rank && /^\d{1,4}$/.test(x)) {
        rank = Number(x);
        break;
      }
    }

    const key = `${year}|${name}|${club}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({
      rank: rank ?? 9999,
      variation_clt: variation ? parseFloat(variation.replace(",", ".")) : null,
      name,
      year,
      club,
      points: points ?? "0",
    });
  }
  return rows;
}

function mergeRows(...lists) {
  const map = new Map();
  for (const list of lists) {
    for (const r of list) {
      const key = `${r.year}|${r.name}|${r.club}`;
      const prev = map.get(key);
      if (!prev || parsePoints(r.points) > parsePoints(prev.points)) map.set(key, r);
    }
  }
  return [...map.values()];
}

async function discoverBirthFilters(page) {
  const birthSelect = page.locator("select").filter({
    has: page.locator('option', { hasText: /\(\d+\s*ans\)/i }),
  }).first();

  return birthSelect.evaluate((sel) => {
    return Array.from(sel.options)
      .map((o) => {
        const text = (o.textContent || "").trim();
        const m = text.match(/^(\d{4})\s*\(/);
        if (!m) return null;
        return { value: o.value, birthYear: Number(m[1]), label: text };
      })
      .filter(Boolean);
  });
}

async function getFilterLocators(page) {
  const count = await page.locator("select").count();
  let birth;
  let gender;
  let tranche;

  for (let i = 0; i < count; i++) {
    const sel = page.locator("select").nth(i);
    const html = await sel.evaluate((el) => el.innerHTML);
    if (!birth && /\(\d+\s*ans\)/i.test(html)) birth = sel;
    else if (!gender && /Garçons|Filles/i.test(html)) gender = sel;
    else if (!tranche && /Top\s*100/i.test(html)) tranche = sel;
  }

  if (!birth || !gender || !tranche) {
    throw new Error("Filtres WB27 introuvables (année / sexe / tranche)");
  }
  return { birth, gender, tranche };
}

async function getClassementDate(page) {
  return page.locator('input[value*="/"]').first().inputValue().catch(() => null);
}

async function waitForTableData(page, expectedYear) {
  try {
    await page.waitForFunction(
      (year) => {
        const inputs = [...document.querySelectorAll("input")].map((i) => i.value || "");
        if (inputs.some((v) => new RegExp(`\\[${year}\\]`).test(v))) return true;
        const text = document.body.innerText || "";
        return new RegExp(`\\[${year}\\]\\s*\\(`).test(text);
      },
      expectedYear,
      { timeout: 20000 }
    );
  } catch {
    await page.waitForTimeout(3000);
  }
}

/** Clic « Actualiser » — WinDev utilise souvent une image, pas un vrai bouton HTML */
async function clickActualiser(page) {
  const viaJs = await page.evaluate(() => {
    const candidates = document.querySelectorAll(
      'img, input[type="image"], button, a, [onclick], td, span'
    );
    for (const el of candidates) {
      const src = String(el.src || el.getAttribute?.("src") || "").toLowerCase();
      const alt = String(el.alt || el.title || el.getAttribute?.("title") || "").toLowerCase();
      const txt = (el.textContent || "").trim().toLowerCase();
      if (
        src.includes("actualiser") ||
        alt.includes("actualiser") ||
        txt === "actualiser"
      ) {
        el.click();
        return "js";
      }
    }
    return null;
  });
  if (viaJs) return true;

  const locators = [
    page.getByRole("button", { name: /actualiser/i }),
    page.locator('input[type="image"][src*="actualiser" i]'),
    page.locator('img[src*="actualiser" i]'),
    page.locator('a:has(img[src*="actualiser" i])'),
  ];

  for (const loc of locators) {
    const n = await loc.count();
    if (!n) continue;
    try {
      await loc.first().click({ timeout: 5000, force: true });
      return true;
    } catch {
      /* essai suivant */
    }
  }
  return false;
}

async function waitForAjax(page, ajaxBodies, timeoutMs = 28000) {
  try {
    const resp = await page.waitForResponse(
      (r) =>
        r.request().method() === "POST" &&
        r.url().includes("PAGE_ACCUEIL") &&
        r.status() === 200,
      { timeout: timeoutMs }
    );
    const body = await resp.text();
    if (body.length > 200) ajaxBodies.push(body);
    return body;
  } catch {
    return "";
  }
}

async function refreshTable(page, ajaxBodies) {
  const ajaxPromise = waitForAjax(page, ajaxBodies);
  await clickActualiser(page);
  await ajaxPromise;
  await page.waitForTimeout(2500);
}

async function extractAllSources(page, expectedYear, ajaxBodies) {
  await waitForTableData(page, expectedYear);

  const snap = await page.evaluate(() => {
    const tableRoot =
      document.querySelector('[id*="A7"]')?.closest("table")?.parentElement ||
      document.querySelector('[class*="wb"]') ||
      document.body;
    const inputValues = Array.from(document.querySelectorAll("input, textarea"))
      .map((el) => (el.value || "").trim())
      .filter((v) => v && v !== "0");
    return {
      tableHtml: tableRoot?.innerHTML?.slice(0, 80000) ?? "",
      innerText: (document.body.innerText || "").slice(0, 12000),
      inputValues,
      inputsWithBracket: inputValues.filter((v) => /\[\d{4}\]/.test(v)),
    };
  });

  const pageHtml = await page.content();
  const fromInputs = parseFromInputValues(snap.inputValues, expectedYear);
  const fromText = parsePlayersFromText(snap.innerText, expectedYear);
  const fromHtml = parsePlayersFromText(pageHtml, expectedYear);

  let fromAjax = [];
  for (const body of ajaxBodies) {
    fromAjax = fromAjax.concat(parsePlayersFromText(body, expectedYear));
  }

  return {
    rows: mergeRows(fromInputs, fromText, fromHtml, fromAjax),
    snap,
    pageHtml,
  };
}

function pushPlayers(all, seen, rows, sexe, filterLabel, expectedYear) {
  const filtered = rows
    .filter((r) => r.year === expectedYear)
    .sort((a, b) => parsePoints(b.points) - parsePoints(a.points) || a.rank - b.rank)
    .slice(0, 5);

  for (let i = 0; i < filtered.length; i++) {
    const r = filtered[i];
    const { nom, prenom } = splitName(r.name);
    const key = `${r.year}|${sexe}|${nom}|${prenom}`;
    if (seen.has(key)) continue;
    seen.add(key);
    all.push({
      classement_national: r.rank < 9000 ? r.rank : 0,
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

async function saveDebug(filterLabel, data) {
  if (!DEBUG) return;
  fs.mkdirSync(DEBUG_DIR, { recursive: true });
  const safe = filterLabel.replace(/[^a-z0-9-]/gi, "_");
  fs.writeFileSync(path.join(DEBUG_DIR, `${safe}-table.html`), data.snap.tableHtml || "", "utf8");
  fs.writeFileSync(
    path.join(DEBUG_DIR, `${safe}-inputs.json`),
    JSON.stringify(data.snap.inputsWithBracket, null, 2),
    "utf8"
  );
  fs.writeFileSync(
    path.join(DEBUG_DIR, `${safe}-rows.json`),
    JSON.stringify(data.rows, null, 2),
    "utf8"
  );
  fs.writeFileSync(
    path.join(DEBUG_DIR, `${safe}-innerText.txt`),
    data.snap.innerText || "",
    "utf8"
  );
}

async function fetchTop5ForFilter(page, filters, birth, g, ajaxBodies) {
  const filterLabel = `${birth.birthYear}-${g.sexe}`;
  let merged = [];

  const trancheValues = ["1", "2", "3", "4", "5"];

  for (const tr of trancheValues) {
    const ajaxPromise = waitForAjax(page, ajaxBodies);
    await filters.birth.selectOption(String(birth.value));
    await page.waitForTimeout(350);
    await filters.gender.selectOption(String(g.value));
    await page.waitForTimeout(350);
    await filters.tranche.selectOption(tr);
    await page.waitForTimeout(500);
    await clickActualiser(page);
    await ajaxPromise;
    await page.waitForTimeout(2000);

    const { rows, snap, pageHtml } = await extractAllSources(
      page,
      birth.birthYear,
      ajaxBodies
    );
    merged = mergeRows(merged, rows);

    if (DEBUG) {
      await page.screenshot({
        path: path.join(DEBUG_DIR, `${filterLabel}-tr${tr}.png`),
        fullPage: true,
      });
      await saveDebug(`${filterLabel}-tr${tr}`, { rows: merged, snap, pageHtml });
    }

    if (merged.filter((r) => r.year === birth.birthYear).length >= 5) break;
  }

  return { filterLabel, rows: merged.filter((r) => r.year === birth.birthYear) };
}

/** Utilise le JSON déjà présent (79 joueurs) — pas besoin du scrape WB27 */
function useExistingJsonOnly() {
  if (!fs.existsSync(OUT)) {
    console.error("Fichier absent:", OUT);
    process.exit(1);
  }
  const data = JSON.parse(fs.readFileSync(OUT, "utf8"));
  const n = data.players?.length ?? 0;
  console.log(`Fichier existant: ${n} joueurs (${OUT})`);
  if (n === 0) process.exit(1);
  console.log("\n→ Ouvrez l'app : Joueurs → Intégrer classement FRMT");
  console.log("  (npm run dev — port 3001 si 3000 occupé)");
  process.exit(0);
}

async function main() {
  if (process.argv.includes("--use-json")) {
    useExistingJsonOnly();
    return;
  }

  let chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch {
    console.error(
      "Installez Playwright: npm install -D playwright && npx playwright install chromium"
    );
    process.exit(1);
  }

  if (DEBUG) fs.mkdirSync(DEBUG_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: !DEBUG });
  const context = await browser.newContext({
    locale: "fr-FR",
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();
  const ajaxBodies = [];
  page.on("response", async (response) => {
    if (response.request().method() !== "POST") return;
    try {
      const body = await response.text();
      if (body.length > 200) ajaxBodies.push(body);
    } catch {
      /* ignore */
    }
  });
  const all = [];
  const seen = new Set();
  const errors = [];
  let classementDate = null;

  try {
    console.log("Ouverture", URL);
    await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 120000 });
    await page.waitForTimeout(5000);

    classementDate = await getClassementDate(page);
    const filters = await getFilterLocators(page);

    const discovered = await discoverBirthFilters(page);
    const birthFilters = discovered.filter(
      (b) => b.birthYear >= BIRTH_YEAR_MIN && b.birthYear <= BIRTH_YEAR_MAX
    );
    console.log(
      "Filtres année:",
      birthFilters.map((b) => `${b.birthYear}=${b.value}`).join(", ")
    );

    if (DEBUG) {
      await page.screenshot({ path: path.join(DEBUG_DIR, "00-initial.png"), fullPage: true });
      fs.writeFileSync(path.join(DEBUG_DIR, "00-page.html"), await page.content(), "utf8");
    }

    for (const birth of birthFilters) {
      for (const g of GENDERS) {
        try {
          const { filterLabel, rows } = await fetchTop5ForFilter(
            page,
            filters,
            birth,
            g,
            ajaxBodies
          );
          const n = pushPlayers(all, seen, rows, g.sexe, filterLabel, birth.birthYear);
          console.log(
            `OK ${filterLabel}: ${n} joueurs (sources: ${rows.length} lignes brutes)`
          );
          if (n === 0 && DEBUG) {
            console.warn(`  ⚠ Aucune ligne — voir data/frmt/debug/${filterLabel}-*`);
          }
        } catch (e) {
          errors.push(`${birth.birthYear}-${g.sexe}: ${e.message}`);
          console.error(`ERR ${birth.birthYear}-${g.sexe}:`, e.message);
        }
      }
    }

    const missingYears = [2005, 2006, 2007].filter(
      (y) => !birthFilters.some((b) => b.birthYear === y)
    );
    if (missingYears.length) {
      for (const g of GENDERS) {
        try {
          await filters.birth.selectOption("1");
          await filters.gender.selectOption(String(g.value));
          await refreshTable(page, ajaxBodies);
          for (const year of missingYears) {
            const { rows } = await extractAllSources(page, year, ajaxBodies);
            const filterLabel = `${year}-${g.sexe}`;
            const n = pushPlayers(all, seen, rows, g.sexe, filterLabel, year);
            console.log(`OK ${filterLabel} (Tous): ${n} joueurs`);
          }
        } catch (e) {
          errors.push(`Tous-${g.sexe}: ${e.message}`);
        }
      }
    }

    if (DEBUG) {
      fs.writeFileSync(
        path.join(DEBUG_DIR, "ajax-last.txt"),
        ajaxBodies[ajaxBodies.length - 1]?.slice(0, 100000) ?? "",
        "utf8"
      );
    }
  } finally {
    await browser.close();
  }

  const scoped = all.filter((p) => inBirthScope(p.annee_naissance));

  console.log("\n=== RÉSULTAT ===");
  console.log(JSON.stringify({ count: scoped.length, path: OUT, errors }, null, 2));

  if (scoped.length === 0) {
    const prev = fs.existsSync(OUT)
      ? (JSON.parse(fs.readFileSync(OUT, "utf8")).players?.length ?? 0)
      : 0;
    console.error(
      `\n0 joueur extrait — scrape WB27 en échec. Fichier conservé (${prev} joueurs).`
    );
    console.error("Intégrer SANS scrape : npm run integrate:frmt");
    console.error("Puis dans l'app : Intégrer classement FRMT");
    console.error("Debug : npm run import:frmt-classement:debug");
    process.exit(1);
  }

  const payload = {
    source: URL,
    fetchedAt: new Date().toISOString(),
    classementDate,
    birthYearMin: BIRTH_YEAR_MIN,
    birthYearMax: BIRTH_YEAR_MAX,
    note: `Top 5 garçons/filles isolés par année ${BIRTH_YEAR_MIN}–${BIRTH_YEAR_MAX} (WB27)`,
    players: scoped,
  };
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(payload, null, 2), "utf8");
  console.log(`Écrit: ${OUT} (${scoped.length} joueurs)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
