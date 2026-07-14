#!/usr/bin/env node
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const env = Object.fromEntries(
  readFileSync(join(root, ".env.local"), "utf8")
    .split(/\r?\n/)
    .filter((l) => l.trim() && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")];
    })
);

const dbUrl = env.SUPABASE_DB_URL;
if (!dbUrl) {
  console.error("SUPABASE_DB_URL manquant dans .env.local");
  process.exit(1);
}

const sql = readFileSync(
  join(root, "supabase/migrations/063_classements_externes_evolution.sql"),
  "utf8"
);

const client = new pg.Client({ connectionString: dbUrl });
await client.connect();
await client.query(sql);
await client.end();
console.log("Migration 063 appliquée");
