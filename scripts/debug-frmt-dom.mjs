#!/usr/bin/env node
/** Debug DOM FRMT WB27 — extrait structure tableau */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEBUG_DIR = path.join(__dirname, "..", "data", "frmt", "debug");
const URL = "https://info.frmt.ma/FRMT_CLASSEMENT_WB27";

async function main() {
  const { chromium } = await import("playwright");
  fs.mkdirSync(DEBUG_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

  await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForTimeout(4000);

  // Filtres: 2014 + garçons
  await page.locator("select").nth(0).selectOption("4");
  await page.locator("select").nth(1).selectOption("1");
  await page.waitForTimeout(500);

  const actualiser = page.locator('img[src*="actualiser"], input[src*="actualiser"]').first();
  await actualiser.click({ timeout: 10000 });
  await page.waitForTimeout(4000);
  await page.waitForLoadState("networkidle").catch(() => {});

  const dump = await page.evaluate(() => {
    const playerRe = /\[\d{4}\]/;
    const samples = [];

    for (const inp of document.querySelectorAll("input, textarea")) {
      const v = (inp.value || "").trim();
      if (playerRe.test(v) || (v.length > 8 && /\d{4}/.test(v))) {
        samples.push({ tag: inp.tagName, id: inp.id, class: inp.className, value: v.slice(0, 200) });
      }
    }

    const textHits = [];
    for (const el of document.querySelectorAll("td, div, span, label, p")) {
      const t = (el.textContent || "").trim();
      if (/\[\d{4}\]\s*\(/.test(t) && t.length < 250) textHits.push(t);
    }

    return {
      bodyTextLen: (document.body.innerText || "").length,
      bodySample: (document.body.innerText || "").slice(0, 3000),
      inputSamples: samples.slice(0, 40),
      textHits: [...new Set(textHits)].slice(0, 20),
      selectCount: document.querySelectorAll("select").length,
      tableCount: document.querySelectorAll("table").length,
      iframeCount: document.querySelectorAll("iframe").length,
    };
  });

  fs.writeFileSync(path.join(DEBUG_DIR, "dom-dump.json"), JSON.stringify(dump, null, 2));
  await page.screenshot({ path: path.join(DEBUG_DIR, "screenshot.png"), fullPage: true });
  const html = await page.content();
  fs.writeFileSync(path.join(DEBUG_DIR, "page.html"), html);

  console.log(JSON.stringify(dump, null, 2));
  await browser.close();
}

main().catch(console.error);
