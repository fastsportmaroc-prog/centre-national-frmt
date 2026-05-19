#!/usr/bin/env node
/**
 * Import top 5 FRMT par année de naissance (2007–2014) et sexe depuis
 * https://info.frmt.ma/FRMT_CLASSEMENT_WB27
 *
 * Usage: npm run import:frmt-classement
 * Prérequis: npm install -D playwright && npx playwright install chromium
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "data", "frmt", "classement-top5.json");
const URL = "https://info.frmt.ma/FRMT_CLASSEMENT_WB27";

/** Filtres FRMT (année de naissance) */
const BIRTH_FILTERS = [
  { value: "10", birthYear: 2008 },
  { value: "9", birthYear: 2009 },
  { value: "8", birthYear: 2010 },
  { value: "7", birthYear: 2011 },
  { value: "6", birthYear: 2012 },
  { value: "5", birthYear: 2013 },
  { value: "4", birthYear: 2014 },
];

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

function splitName(full) {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { nom: "?", prenom: "?" };
  if (parts.length === 1) return { nom: parts[0], prenom: "—" };
  return { prenom: parts[parts.length - 1], nom: parts.slice(0, -1).join(" ") };
}

function parsePoints(s) {
  return Number(String(s).replace(/\s/g, "").replace(",", ".")) || 0;
}

function parsePlayersFromText(text, expectedYear, sexe, filterLabel) {
  const players = [];
  const lines = text.split(/\r?\n/);
  const re =
    /(\d+)\s+([+-]?\d+[,.]?\d*)?\s+(.+?)\s+\[(\d{4})\]\s+\(([^)]+)\)\s+.*?([\d]+[,.][\d]+|[\d]+)\s*$/i;

  for (const line of lines) {
    const m = line.match(re);
    if (!m) continue;
    const birth = Number(m[4]);
    if (expectedYear && birth !== expectedYear) continue;
    const { nom, prenom } = splitName(m[3]);
    players.push({
      classement_national: Number(m[1]),
      points: parsePoints(m[6]),
      nom: nom.toUpperCase(),
      prenom: prenom.toUpperCase(),
      annee_naissance: birth,
      club: m[5].trim(),
      sexe,
      categorie_age: categorieFromBirthYear(birth),
      frmt_filter: filterLabel,
    });
  }

  players.sort((a, b) => b.points - a.points);
  return players.slice(0, 5).map((p, i) => ({ ...p, rang_categorie: i + 1 }));
}

async function extractTable(page) {
  return page.evaluate(() => {
    const rows = [];
    const re = /(\d+)\s+(.+?)\s+\[(\d{4})\]\s+\(([^)]+)\)/;
    const all = document.body.innerText || "";
    for (const line of all.split("\n")) {
      const m = line.match(re);
      if (!m) continue;
      const pts = line.match(/([\d]+[,.][\d]+)\s*Points?/i);
      rows.push({
        rank: Number(m[1]),
        name: m[2].trim(),
        year: Number(m[3]),
        club: m[4].trim(),
        points: pts ? pts[1] : "0",
        line,
      });
    }
    return rows;
  });
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
  else await page.locator('img[src*="actualiser"], input[src*="actualiser"]').first().click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(2500);
}

async function main() {
  let chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch {
    console.error("Installez Playwright: npm install -D playwright && npx playwright install chromium");
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const all = [];
  const seen = new Set();
  const errors = [];

  try {
    await page.goto(URL, { waitUntil: "networkidle", timeout: 90000 });
    await page.waitForTimeout(3000);

    for (const birth of BIRTH_FILTERS) {
      for (const g of GENDERS) {
        const filterLabel = `${birth.birthYear}-${g.sexe}`;
        try {
          await selectBirthYear(page, birth.value);
          await selectGender(page, g.value);
          await clickActualiser(page);

          const rows = await extractTable(page);
          const filtered = rows
            .filter((r) => r.year === birth.birthYear)
            .sort((a, b) => parsePoints(b.points) - parsePoints(a.points))
            .slice(0, 5);

          for (let i = 0; i < filtered.length; i++) {
            const r = filtered[i];
            const { nom, prenom } = splitName(r.name);
            const key = `${r.year}|${g.sexe}|${nom}|${prenom}`;
            if (seen.has(key)) continue;
            seen.add(key);
            all.push({
              classement_national: r.rank,
              points: parsePoints(r.points),
              nom,
              prenom,
              annee_naissance: r.year,
              club: r.club,
              sexe: g.sexe,
              categorie_age: categorieFromBirthYear(r.year),
              rang_categorie: i + 1,
              frmt_filter: filterLabel,
            });
          }
          console.log(`OK ${filterLabel}: ${filtered.length} joueurs`);
        } catch (e) {
          errors.push(`${filterLabel}: ${e.message}`);
        }
      }
    }

    for (const g of GENDERS) {
      try {
        await selectBirthYear(page, "1");
        await selectGender(page, g.value);
        await clickActualiser(page);
        const rows = (await extractTable(page))
          .filter((r) => r.year === 2007)
          .sort((a, b) => parsePoints(b.points) - parsePoints(a.points))
          .slice(0, 5);
        for (let i = 0; i < rows.length; i++) {
          const r = rows[i];
          const { nom, prenom } = splitName(r.name);
          const key = `2007|${g.sexe}|${nom}|${prenom}`;
          if (seen.has(key)) continue;
          seen.add(key);
          all.push({
            classement_national: r.rank,
            points: parsePoints(r.points),
            nom,
            prenom,
            annee_naissance: 2007,
            club: r.club,
            sexe: g.sexe,
            categorie_age: "U18",
            rang_categorie: i + 1,
            frmt_filter: `2007-${g.sexe}`,
          });
        }
        console.log(`OK 2007-${g.sexe}: ${rows.length} joueurs`);
      } catch (e) {
        errors.push(`2007-${g.sexe}: ${e.message}`);
      }
    }
  } finally {
    await browser.close();
  }

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  const payload = {
    source: URL,
    fetchedAt: new Date().toISOString(),
    players: all,
  };
  fs.writeFileSync(OUT, JSON.stringify(payload, null, 2), "utf8");
  console.log(JSON.stringify({ count: all.length, path: OUT, errors }, null, 2));
  console.log("\nRelancez l'app pour recharger data/frmt/classement-top5.json dans la liste joueurs.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
