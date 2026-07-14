#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const log = [];

function loadEnv() {
  const envPath = path.join(ROOT, ".env.local");
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 1) continue;
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))
      v = v.slice(1, -1);
    process.env[t.slice(0, i).trim()] = v;
  }
}

async function main() {
  loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const dbUrl =
    process.env.SUPABASE_DB_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL;

  log.push(`db_url: ${dbUrl ? "set" : "missing"}`);

  const admin = createClient(url, key, { auth: { persistSession: false } });
  const { error: checkErr } = await admin.from("classements_maroc_scrapes").select("id").limit(1);

  if (!checkErr) {
    log.push("migration: already applied");
  } else if (dbUrl) {
    const pg = await import("pg");
    const sql = fs.readFileSync(
      path.join(ROOT, "supabase/migrations/062_classements_maroc_scrapes.sql"),
      "utf8"
    );
    const client = new pg.default.Client({
      connectionString: dbUrl,
      ssl: dbUrl.includes("localhost") ? false : { rejectUnauthorized: false },
    });
    await client.connect();
    await client.query(sql);
    await client.end();
    log.push("migration: applied via pg");
  } else {
    log.push(`migration: BLOCKED — ${checkErr.message}`);
    fs.writeFileSync(path.join(ROOT, "MIGRATION_MAROC_LOG.txt"), log.join("\n"), "utf8");
    process.exit(1);
  }

  log.push("scrape: starting…");
  const { spawnSync } = await import("child_process");
  const scrape = spawnSync("node", [path.join(ROOT, "scripts/scrape-classements-maroc.mjs")], {
    cwd: ROOT,
    encoding: "utf8",
    env: process.env,
  });
  log.push(scrape.stdout?.trim() || "");
  if (scrape.stderr) log.push(scrape.stderr.trim());
  if (scrape.status !== 0) {
    log.push(`scrape: exit ${scrape.status}`);
    fs.writeFileSync(path.join(ROOT, "MIGRATION_MAROC_LOG.txt"), log.join("\n"), "utf8");
    process.exit(scrape.status ?? 1);
  }

  const { count } = await admin
    .from("classements_maroc_scrapes")
    .select("id", { count: "exact", head: true });
  log.push(`verify: ${count ?? 0} rows in classements_maroc_scrapes`);

  const { data: sample } = await admin
    .from("classements_maroc_scrapes")
    .select("nom_joueur, type_classement, rang, est_membre_cne")
    .order("rang")
    .limit(5);
  log.push("sample: " + JSON.stringify(sample));

  fs.writeFileSync(path.join(ROOT, "MIGRATION_MAROC_LOG.txt"), log.join("\n"), "utf8");
  console.log(log.join("\n"));
}

main().catch((e) => {
  fs.writeFileSync(
    path.join(ROOT, "MIGRATION_MAROC_LOG.txt"),
    String(e?.stack || e),
    "utf8"
  );
  process.exit(1);
});
