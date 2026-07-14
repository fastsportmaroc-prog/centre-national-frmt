#!/usr/bin/env node
/**
 * Applique la migration 064 (discipline simple/double).
 * Usage: node scripts/apply-classements-maroc-discipline-migration.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const SQL_PATH = path.join(ROOT, "supabase/migrations/064_classements_maroc_discipline.sql");

function loadEnvLocal() {
  const envPath = path.join(ROOT, ".env.local");
  if (!fs.existsSync(envPath)) {
    console.error(".env.local introuvable");
    process.exit(1);
  }
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}

async function main() {
  loadEnvLocal();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const dbUrl =
    process.env.SUPABASE_DB_URL ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL;

  if (!url || !serviceKey) {
    console.error("NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquant");
    process.exit(1);
  }

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { error: probe } = await admin
    .from("classements_maroc_scrapes")
    .select("discipline")
    .limit(1);
  if (!probe) {
    console.log("✅ Colonne discipline déjà présente.");
    return;
  }
  if (!/discipline|column|schema cache|PGRST/i.test(probe.message)) {
    console.warn(probe.message);
  }

  if (!dbUrl) {
    console.error(`
❌ SUPABASE_DB_URL manquant.
Exécutez supabase/migrations/064_classements_maroc_discipline.sql dans le SQL Editor Supabase.
`);
    process.exit(1);
  }

  const sql = fs.readFileSync(SQL_PATH, "utf8");
  const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    await client.query(sql);
    console.log("✅ Migration 064 appliquée (discipline simple/double).");
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
