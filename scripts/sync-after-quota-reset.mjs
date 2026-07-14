#!/usr/bin/env node
/**
 * Attend minuit Maroc puis lance sync-classements avec retries sur 429.
 */
import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const logPath = join(root, "scripts", "sync-after-quota-reset.log");

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  writeFileSync(logPath, line + "\n", { flag: "a" });
}

function marocNow() {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Africa/Casablanca" }));
}

function fmt(d) {
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Attendre jusqu'à hour:minute heure Maroc (aujourd'hui ou demain). */
async function waitUntilMaroc(hour, minute) {
  for (;;) {
    const now = marocNow();
    const th = now.getHours();
    const tm = now.getMinutes();
    if (th > hour || (th === hour && tm >= minute)) {
      log(`Heure Maroc atteinte: ${fmt(now)} (cible ${hour}:${String(minute).padStart(2, "0")})`);
      return;
    }

    let target = new Date(now);
    target.setHours(hour, minute, 0, 0);
    if (target <= now) target.setDate(target.getDate() + 1);

    const waitMs = target.getTime() - now.getTime();
    log(
      `Attente… Maroc ${fmt(now)} → cible ${hour}:${String(minute).padStart(2, "0")} (${Math.ceil(waitMs / 60000)} min)`
    );
    await sleep(Math.min(waitMs, 60_000));
  }
}

async function runSync() {
  const script = join(root, "scripts", "test-sync-classements-fn.mjs");
  return execSync(`node "${script}"`, { encoding: "utf8", cwd: root });
}

function parseSummary(out) {
  const m = out.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    return JSON.parse(m[0]);
  } catch {
    return null;
  }
}

async function main() {
  writeFileSync(logPath, "");
  log("=== sync-after-quota-reset démarré ===");
  log(`Maroc maintenant: ${fmt(marocNow())}`);

  await waitUntilMaroc(0, 5);

  const maxAttempts = 8;
  const retryWaitMs = 12 * 60 * 1000;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const now = marocNow();
    log(`Tentative ${attempt}/${maxAttempts} (Maroc ${fmt(now)})`);

    let out;
    try {
      out = await runSync();
    } catch (e) {
      const stdout = e.stdout?.toString?.() ?? "";
      const stderr = e.stderr?.toString?.() ?? "";
      log(`Sync exit non-zero: ${e.message}`);
      if (stdout) log(stdout.slice(0, 3000));
      if (stderr) log(stderr.slice(0, 1000));
      out = stdout || stderr;
      if (!out) {
        if (attempt < maxAttempts) {
          await sleep(retryWaitMs);
          continue;
        }
        process.exit(1);
      }
    }

    log(out.slice(0, 4000));
    const summary = parseSummary(out);
    const sync = summary?.synchronises ?? 0;
    const quota = summary?.messages?.some((x) => /429|quota/i.test(x));
    const cacheAtp = summary?.messages?.find((x) => /Cache ATP/i.test(x));

    if (sync > 0) {
      log(`SUCCESS synchronises=${sync}`);
      process.exit(0);
    }

    const { h, m } = { h: now.getHours(), m: now.getMinutes() };
    if (quota && h === 0 && m < 65) {
      log("429 à minuit — attente jusqu'à 01:05 Maroc (reset UTC)");
      await waitUntilMaroc(1, 5);
      continue;
    }

    if (attempt < maxAttempts) {
      log(`Pas de sync (quota=${!!quota}, cache=${cacheAtp ?? "?"}) — retry dans 12 min`);
      await sleep(retryWaitMs);
    }
  }

  log("Échec après toutes les tentatives");
  process.exit(1);
}

main().catch((e) => {
  log(`Fatal: ${e.message}`);
  process.exit(1);
});
