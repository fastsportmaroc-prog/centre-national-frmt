#!/usr/bin/env node
/**
 * Vérifie / applique les colonnes tailles textiles & chaussures (joueurs + entraineurs).
 * Nécessite SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL dans .env.local
 *
 * Usage: node scripts/apply-equipement-tailles-migration.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

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

const SQL = `
alter table public.joueurs add column if not exists taille_survetement text;
alter table public.joueurs add column if not exists taille_tshirt text;
alter table public.joueurs add column if not exists taille_short text;
alter table public.joueurs add column if not exists taille_jupe text;
alter table public.joueurs add column if not exists taille_chaussures text;
alter table public.entraineurs add column if not exists taille_survetement text;
alter table public.entraineurs add column if not exists taille_tshirt text;
alter table public.entraineurs add column if not exists taille_short text;
alter table public.entraineurs add column if not exists taille_jupe text;
alter table public.entraineurs add column if not exists taille_chaussures text;
notify pgrst, 'reload schema';
`.trim();

async function columnExists(client, table, column) {
  const { error } = await client.from(table).select(column).limit(1);
  if (!error) return true;
  if (/column|schema cache|does not exist/i.test(error.message)) return false;
  console.warn(`[${table}.${column}]`, error.message);
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

  if (!url) {
    console.error("NEXT_PUBLIC_SUPABASE_URL manquant");
    process.exit(1);
  }

  const checks = [
    ["joueurs", "taille_chaussures"],
    ["joueurs", "taille_survetement"],
    ["entraineurs", "taille_chaussures"],
  ];

  if (serviceKey?.startsWith("eyJ")) {
    const client = createClient(url, serviceKey);
    let allOk = true;
    for (const [table, col] of checks) {
      const ok = await columnExists(client, table, col);
      console.log(`${table}.${col}: ${ok ? "OK" : "MANQUANT"}`);
          if (!ok) allOk = false;
    }
    if (allOk) {
      console.log("\n✅ Colonnes déjà présentes — rien à faire.");
      return;
    }
  }

  if (dbUrl) {
    try {
      const pg = await import("pg");
      const client = new pg.default.Client({ connectionString: dbUrl });
      await client.connect();
      await client.query(SQL);
      await client.end();
      console.log("✅ Migration SQL exécutée via connexion Postgres.");
      return;
    } catch (e) {
      console.warn("Connexion Postgres:", e.message);
      console.warn("Installez pg: npm install pg");
    }
  }

  console.log(`
❌ Colonnes tailles absentes en base.

Copiez ce SQL dans Supabase → SQL Editor → Run :

${SQL}

Puis : Settings → API → Reload schema (ou attendez ~1 min).

Fichier local : lib/db/migrations/equipement_tailles_complet.sql
`);
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
