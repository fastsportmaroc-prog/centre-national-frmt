#!/usr/bin/env node
/**
 * Applique la migration 062 (classements_maroc_scrapes).
 * Usage: node scripts/apply-classements-maroc-migration.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const SQL_PATH = path.join(ROOT, "supabase/migrations/062_classements_maroc_scrapes.sql");

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

async function tableExists(client) {
  const { error } = await client.from("classements_maroc_scrapes").select("id").limit(1);
  if (!error) return true;
  if (/schema cache|does not exist|could not find|PGRST205/i.test(error.message)) return false;
  console.warn("[classements_maroc_scrapes]", error.message);
  return false;
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
  if (await tableExists(admin)) {
    console.log("✅ Table classements_maroc_scrapes déjà présente.");
    return;
  }

  if (!fs.existsSync(SQL_PATH)) {
    console.error("Migration introuvable:", SQL_PATH);
    process.exit(1);
  }

  if (!dbUrl) {
    console.error(`
❌ Table absente et SUPABASE_DB_URL manquant.

Exécutez supabase/migrations/062_classements_maroc_scrapes.sql dans le SQL Editor Supabase,
ou ajoutez SUPABASE_DB_URL dans .env.local puis relancez ce script.
`);
    process.exit(1);
  }

  const sql = fs.readFileSync(SQL_PATH, "utf8");
  const pg = await import("pg");
  const client = new pg.default.Client({
    connectionString: dbUrl,
    ssl: dbUrl.includes("localhost") ? false : { rejectUnauthorized: false },
  });
  await client.connect();
  console.log("Application migration 062…");
  await client.query(sql);
  await client.end();

  if (await tableExists(admin)) {
    console.log("✅ Migration 062 appliquée avec succès.");
  } else {
    console.error("⚠ Migration exécutée mais table non visible — rechargez le schéma API Supabase.");
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
