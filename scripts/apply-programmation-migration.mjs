#!/usr/bin/env node
/**
 * Crée la table programmation_evenements si absente.
 * Nécessite SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL dans .env.local
 * Optionnel : SUPABASE_DB_URL / DATABASE_URL pour exécution SQL directe.
 *
 * Usage: node scripts/apply-programmation-migration.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const SQL_PATH = path.join(ROOT, "lib/db/migrations/programmation_evenements.sql");

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
    process.env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
}

async function tableExists(client) {
  const { error } = await client.from("programmation_evenements").select("id").limit(1);
  if (!error) return true;
  if (/schema cache|does not exist|could not find/i.test(error.message)) return false;
  console.warn("[programmation_evenements]", error.message);
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
  const sql = fs.readFileSync(SQL_PATH, "utf8");

  if (!url) {
    console.error("NEXT_PUBLIC_SUPABASE_URL manquant");
    process.exit(1);
  }

  if (serviceKey?.startsWith("eyJ")) {
    const client = createClient(url, serviceKey);
    const ok = await tableExists(client);
    console.log(`programmation_evenements: ${ok ? "OK" : "MANQUANT"}`);
    if (ok) {
      console.log("\n✅ Table déjà présente — rien à faire.");
      return;
    }
  }

  if (dbUrl) {
    try {
      const pg = await import("pg");
      const client = new pg.default.Client({ connectionString: dbUrl });
      await client.connect();
      await client.query(sql);
      await client.end();
      console.log("✅ Migration programmation_evenements exécutée via Postgres.");
      return;
    } catch (e) {
      console.warn("Connexion Postgres:", e.message);
    }
  }

  console.log(`
❌ Table programmation_evenements absente en base.

Copiez le contenu de lib/db/migrations/programmation_evenements.sql
dans Supabase → SQL Editor → Run.

Puis : Settings → API → Reload schema (ou attendez ~1 min).
`);
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
