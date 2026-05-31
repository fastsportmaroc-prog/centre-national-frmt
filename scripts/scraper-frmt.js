#!/usr/bin/env node
/**
 * Scraper FRMT WB27 — Puppeteer
 * URL: https://info.frmt.ma/FRMT_CLASSEMENT_WB27
 *
 * Extrait les 6 premiers garçons et 6 premières filles par année de naissance (2004–2015).
 * Sortie: output/joueurs-frmt.json
 *
 * Usage:
 *   node scripts/scraper-frmt.js
 *   node scripts/scraper-frmt.js --debug
 *   node scripts/scraper-frmt.js --headless=false
 */
const fs = require("fs");
const path = require("path");

const URL = "https://info.frmt.ma/FRMT_CLASSEMENT_WB27";
const OUT = path.join(__dirname, "..", "output", "joueurs-frmt.json");
const DEBUG_DIR = path.join(__dirname, "..", "output", "frmt-debug");

const BIRTH_YEAR_MIN = 2004;
const BIRTH_YEAR_MAX = 2015;
const TOP_N = 6;
const DEBUG = process.argv.includes("--debug");
const HEADLESS = !process.argv.includes("--headless=false");

const GENDERS = [
  { value: "1", sexe: "M", label: "Garçons" },
  { value: "2", sexe: "F", label: "Filles" },
];

function categorieFromBirthYear(year) {
  if (year === 2015) return "U10";
  if (year >= 2013) return "U12";
  if (year >= 2011) return "U14";
  if (year >= 2009) return "U16";
  if (year >= 2007) return "U18";
  return "Junior";
}

function splitName(full) {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { nom: "?", prenom: "?" };
  if (parts.length === 1) return { nom: parts[0], prenom: "—" };
  return { prenom: parts[parts.length - 1], nom: parts.slice(0, -1).join(" ") };
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

function addParsedRow(rows, seen, name, year, club, expectedYear) {
  const y = Number(year);
  if (!Number.isFinite(y) || (expectedYear && y !== expectedYear)) return;
  const n = String(name).trim();
  const c = String(club).trim();
  const key = `${y}|${n}|${c}`;
  if (seen.has(key)) return;
  seen.add(key);
  rows.push({ name: n, year: y, club: c });
}

function parsePlayersFromText(text, expectedYear = null) {
  if (!text || text.length < 20) return [];
  const decoded = decodeHtmlEntities(text);
  const compact = decoded.replace(/\s+/g, " ");
  const rows = [];
  const seen = new Set();

  const nameRe = /([\p{L}][\p{L}\s.'-]{2,}?)\s*\[(\d{4})\]\s*\(([^)]+)\)/giu;
  let m;
  while ((m = nameRe.exec(compact)) !== null) {
    addParsedRow(rows, seen, m[1], m[2], m[3], expectedYear);
  }

  for (const vm of decoded.matchAll(/value="([^"]*\[\d{4}\][^"]*)"/gi)) {
    const nm = vm[1].match(NAME_LINE_RE);
    if (!nm) continue;
    addParsedRow(rows, seen, nm[1], nm[2], nm[3], expectedYear);
  }

  return rows;
}

function parseFromInputValues(values, expectedYear = null) {
  const rows = [];
  const seen = new Set();
  for (const v of values) {
    const nm = v.match(NAME_LINE_RE);
    if (!nm) continue;
    addParsedRow(rows, seen, nm[1], nm[2], nm[3], expectedYear);
  }
  return rows;
}

function mergeRows(...lists) {
  const map = new Map();
  for (const list of lists) {
    for (const r of list) {
      const key = `${r.year}|${r.name}|${r.club}`;
      if (!map.has(key)) map.set(key, r);
    }
  }
  return [...map.values()];
}

function birthDateFromYear(year) {
  return `${year}-01-01`;
}

function playerKey(nom, prenom, dateNaissance, sexe) {
  return `${dateNaissance}|${sexe}|${nom.trim().toLowerCase()}|${prenom.trim().toLowerCase()}`;
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function getFilterSelects(page) {
  return page.evaluate(() => {
    const selects = [...document.querySelectorAll("select")];
    let birth = null;
    let gender = null;
    let tranche = null;
    for (let i = 0; i < selects.length; i++) {
      const html = selects[i].innerHTML;
      if (!birth && /\(\d+\s*ans\)/i.test(html)) birth = i;
      else if (!gender && /Garçons|Filles/i.test(html)) gender = i;
      else if (!tranche && /Top\s*100/i.test(html)) tranche = i;
    }
    return { birth, gender, tranche, count: selects.length };
  });
}

async function selectOption(page, selectIndex, value) {
  await page.evaluate(
    ({ selectIndex, value }) => {
      const sel = document.querySelectorAll("select")[selectIndex];
      if (!sel) throw new Error(`Select index ${selectIndex} introuvable`);
      sel.value = value;
      sel.dispatchEvent(new Event("change", { bubbles: true }));
    },
    { selectIndex, value }
  );
}

async function clickActualiser(page) {
  const clicked = await page.evaluate(() => {
    const candidates = document.querySelectorAll(
      'img, input[type="image"], button, a, [onclick], td, span'
    );
    for (const el of candidates) {
      const src = String(el.src || el.getAttribute?.("src") || "").toLowerCase();
      const alt = String(el.alt || el.title || el.getAttribute?.("title") || "").toLowerCase();
      const txt = (el.textContent || "").trim().toLowerCase();
      if (src.includes("actualiser") || alt.includes("actualiser") || txt === "actualiser") {
        el.click();
        return true;
      }
    }
    return false;
  });
  return clicked;
}

async function waitForYearData(page, expectedYear, timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const ok = await page.evaluate((year) => {
      const inputs = [...document.querySelectorAll("input")].map((i) => i.value || "");
      if (inputs.some((v) => new RegExp(`\\[${year}\\]`).test(v))) return true;
      return new RegExp(`\\[${year}\\]\\s*\\(`).test(document.body.innerText || "");
    }, expectedYear);
    if (ok) return true;
    await sleep(500);
  }
  await sleep(2000);
  return false;
}

async function extractPlayers(page, expectedYear, ajaxBodies) {
  await waitForYearData(page, expectedYear);

  const snap = await page.evaluate(() => {
    const inputValues = Array.from(document.querySelectorAll("input, textarea"))
      .map((el) => (el.value || "").trim())
      .filter((v) => v && v !== "0");
    return {
      innerText: (document.body.innerText || "").slice(0, 15000),
      inputValues,
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

  return mergeRows(fromInputs, fromText, fromHtml, fromAjax).filter((r) => r.year === expectedYear);
}

async function discoverBirthFilters(page) {
  return page.evaluate(() => {
    const birthSelect = [...document.querySelectorAll("select")].find((sel) =>
      /\(\d+\s*ans\)/i.test(sel.innerHTML)
    );
    if (!birthSelect) return [];
    return Array.from(birthSelect.options)
      .map((o) => {
        const text = (o.textContent || "").trim();
        const m = text.match(/^(\d{4})\s*\(/);
        if (!m) return null;
        return { value: o.value, birthYear: Number(m[1]), label: text };
      })
      .filter(Boolean);
  });
}

async function fetchTopForFilter(page, filters, birth, gender, ajaxBodies) {
  const label = `${birth.birthYear}-${gender.sexe}`;
  let merged = [];
  const trancheValues = ["1", "2", "3", "4", "5"];

  for (const tr of trancheValues) {
    ajaxBodies.length = 0;

    await selectOption(page, filters.birth, String(birth.value));
    await sleep(400);
    await selectOption(page, filters.gender, String(gender.value));
    await sleep(400);
    if (filters.tranche != null) {
      await selectOption(page, filters.tranche, tr);
      await sleep(400);
    }

    await clickActualiser(page);
    await sleep(2800);

    const rows = await extractPlayers(page, birth.birthYear, ajaxBodies);
    merged = mergeRows(merged, rows);

    if (DEBUG) {
      fs.mkdirSync(DEBUG_DIR, { recursive: true });
      await page.screenshot({
        path: path.join(DEBUG_DIR, `${label}-tr${tr}.png`),
        fullPage: true,
      });
    }

    if (merged.length >= TOP_N) break;
  }

  return merged.slice(0, TOP_N);
}

async function main() {
  let puppeteer;
  try {
    puppeteer = require("puppeteer");
  } catch {
    console.error("Puppeteer absent. Installez: npm install puppeteer");
    process.exit(1);
  }

  if (DEBUG) fs.mkdirSync(DEBUG_DIR, { recursive: true });
  fs.mkdirSync(path.dirname(OUT), { recursive: true });

  const browser = await puppeteer.launch({
    headless: HEADLESS ? "new" : false,
    timeout: 120000,
    protocolTimeout: 120000,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
    defaultViewport: { width: 1440, height: 900 },
  });

  const page = await browser.newPage();
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
  );

  const ajaxBodies = [];
  page.on("response", async (response) => {
    try {
      if (response.request().method() !== "POST") return;
      const body = await response.text();
      if (body.length > 200) ajaxBodies.push(body);
    } catch {
      /* ignore */
    }
  });

  const output = [];
  const globalSeen = new Set();
  const errors = [];

  try {
    console.log("Ouverture", URL);
    await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 120000 });
    await sleep(5000);

    const filters = await getFilterSelects(page);
    if (filters.birth == null || filters.gender == null) {
      throw new Error("Filtres année / sexe introuvables sur la page WB27");
    }

    const discovered = await discoverBirthFilters(page);
    const birthFilters = discovered.filter(
      (b) => b.birthYear >= BIRTH_YEAR_MIN && b.birthYear <= BIRTH_YEAR_MAX
    );

    console.log(
      "Années détectées:",
      birthFilters.map((b) => b.birthYear).join(", ") || "(aucune)"
    );

    for (const birth of birthFilters) {
      for (const g of GENDERS) {
        try {
          console.log(`→ ${g.label} ${birth.birthYear}…`);
          const rows = await fetchTopForFilter(page, filters, birth, g, ajaxBodies);

          let added = 0;
          for (const r of rows) {
            const { nom, prenom } = splitName(r.name);
            const date_naissance = birthDateFromYear(r.year);
            const key = playerKey(nom, prenom, date_naissance, g.sexe);
            if (globalSeen.has(key)) continue;
            globalSeen.add(key);
            output.push({
              nom,
              prenom,
              date_naissance,
              sexe: g.sexe,
              club: r.club,
              categorie: categorieFromBirthYear(r.year),
            });
            added++;
          }
          console.log(`  ✓ ${added}/${TOP_N} joueurs`);
        } catch (e) {
          const msg = `${birth.birthYear}-${g.sexe}: ${e.message}`;
          errors.push(msg);
          console.error("  ✗", msg);
        }
      }
    }

    // Années absentes du dropdown (2004–2007) ou sans résultat (2015) : filtre « Tous » + extraction par année
    const missingYears = [];
    for (let y = BIRTH_YEAR_MIN; y <= BIRTH_YEAR_MAX; y++) {
      const hasEnough = [...output.filter((j) => j.date_naissance.startsWith(String(y)))].length >= TOP_N;
      if (!hasEnough) missingYears.push(y);
    }

    if (missingYears.length) {
      console.log("\nFallback « Tous » pour années:", missingYears.join(", "));
      const allBirthOption = discovered.find((b) => b.label.toLowerCase().includes("tous")) ?? discovered[0];
      if (allBirthOption) {
        for (const g of GENDERS) {
          await selectOption(page, filters.birth, String(allBirthOption.value));
          await sleep(400);
          await selectOption(page, filters.gender, String(g.value));
          await sleep(400);
          await clickActualiser(page);
          await sleep(3500);

          for (const year of missingYears) {
            const rows = (await extractPlayers(page, year, ajaxBodies))
              .slice(0, TOP_N);
            let added = 0;
            for (const r of rows) {
              const { nom, prenom } = splitName(r.name);
              const date_naissance = birthDateFromYear(r.year);
              const key = playerKey(nom, prenom, date_naissance, g.sexe);
              if (globalSeen.has(key)) continue;
              globalSeen.add(key);
              output.push({
                nom,
                prenom,
                date_naissance,
                sexe: g.sexe,
                club: r.club,
                categorie: categorieFromBirthYear(r.year),
              });
              added++;
            }
            if (added) console.log(`  Fallback ${g.label} ${year}: +${added}`);
          }
        }
      }
    }
  } finally {
    await browser.close();
  }

  output.sort(
    (a, b) =>
      a.date_naissance.localeCompare(b.date_naissance) ||
      a.sexe.localeCompare(b.sexe) ||
      a.nom.localeCompare(b.nom)
  );

  fs.writeFileSync(OUT, JSON.stringify(output, null, 2), "utf8");

  console.log("\n=== RÉSULTAT ===");
  console.log(`Fichier: ${OUT}`);
  console.log(`Joueurs: ${output.length}`);
  if (errors.length) console.log("Erreurs:", errors);
  console.log("\nAperçu (5 premiers):");
  console.log(JSON.stringify(output.slice(0, 5), null, 2));
  console.log("\n→ Validez le JSON, puis lancez: node scripts/import-joueurs-supabase.js --dry-run");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
