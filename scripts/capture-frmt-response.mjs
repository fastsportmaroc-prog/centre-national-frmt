#!/usr/bin/env node
/** Capture AJAX + DOM pour debug scraper FRMT */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const debugDir = path.join(__dirname, "..", "data", "frmt", "debug");
fs.mkdirSync(debugDir, { recursive: true });

let responseIndex = 0;

(async () => {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  page.on("response", async (response) => {
    if (response.request().method() !== "POST") return;
    try {
      const body = await response.text();
      if (!body.includes("PAGE_ACCUEIL") && !body.includes("[")) return;
      responseIndex += 1;
      fs.writeFileSync(
        path.join(debugDir, `response-${String(responseIndex).padStart(3, "0")}.txt`),
        body.slice(0, 200000),
        "utf8"
      );
    } catch {
      /* ignore */
    }
  });

  await page.goto("https://info.frmt.ma/FRMT_CLASSEMENT_WB27", {
    waitUntil: "domcontentloaded",
    timeout: 120000,
  });
  await page.waitForTimeout(5000);

  await page
    .locator("select")
    .filter({ has: page.locator('option', { hasText: /\(\d+\s*ans\)/ }) })
    .first()
    .selectOption("4");
  await page
    .locator("select")
    .filter({ has: page.locator("option", { hasText: /Garçons/i }) })
    .first()
    .selectOption("1");
  await page.waitForTimeout(500);

  await page.getByRole("button", { name: /Actualiser/i }).first().click();
  await page.waitForTimeout(6000);

  const evalResult = await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll("input")).map((inp) => ({
      id: inp.id,
      value: inp.value,
    }));
    return {
      bracketInputs: inputs.filter((x) => /\[\d{4}\]/.test(x.value || "")),
      bodyInnerTextLength: (document.body.innerText || "").length,
      bodyPreview: (document.body.innerText || "").slice(0, 2500),
      tableHtml: (
        document.querySelector('[id*="A7"]')?.closest("div")?.innerHTML || ""
      ).slice(0, 30000),
    };
  });

  fs.writeFileSync(path.join(debugDir, "eval.json"), JSON.stringify(evalResult, null, 2));
  await page.screenshot({ path: path.join(debugDir, "screenshot.png"), fullPage: true });
  fs.writeFileSync(path.join(debugDir, "page.html"), await page.content(), "utf8");

  console.log("bracket inputs:", evalResult.bracketInputs.length);
  console.log("innerText len:", evalResult.bodyInnerTextLength);
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
