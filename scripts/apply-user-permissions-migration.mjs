#!/usr/bin/env node
/**
 * Applique la migration user_permissions (055).
 * Nécessite SUPABASE_DB_URL / DATABASE_URL / POSTGRES_URL dans .env.local
 * ou SUPABASE_SERVICE_ROLE_KEY pour vérifier l'état.
 *
 * Usage: node scripts/apply-user-permissions-migration.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const SQL_PATH = path.join(ROOT, "supabase/migrations/055_user_permissions.sql");
const RPC_ONLY_PATH = path.join(ROOT, "supabase/migrations/055b_user_permissions_rpcs_only.sql");

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
  const { error } = await client.from("user_permissions").select("id").limit(1);
  if (!error) return true;
  if (/schema cache|does not exist|could not find/i.test(error.message)) return false;
  console.warn("[user_permissions]", error.message);
  return false;
}

async function rpcExists(client) {
  const { error } = await client.rpc("get_my_permissions");
  if (!error) return true;
  if (/schema cache|does not exist|could not find/i.test(error.message)) return false;
  console.warn("[get_my_permissions]", error.message);
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

  if (!fs.existsSync(SQL_PATH)) {
    console.error("Fichier migration introuvable:", SQL_PATH);
    process.exit(1);
  }

  const fullSql = fs.readFileSync(SQL_PATH, "utf8");

  if (!url) {
    console.error("NEXT_PUBLIC_SUPABASE_URL manquant");
    process.exit(1);
  }

  let tableOk = false;
  let rpcOk = false;

  if (serviceKey?.startsWith("eyJ")) {
    const client = createClient(url, serviceKey);
    tableOk = await tableExists(client);
    rpcOk = await rpcExists(client);
    console.log(`user_permissions table: ${tableOk ? "OK" : "MANQUANT"}`);
    console.log(`get_my_permissions RPC: ${rpcOk ? "OK" : "MANQUANT"}`);
    if (tableOk && rpcOk) {
      console.log("\n✅ Migration user_permissions déjà appliquée.");
      return;
    }
  }

  if (!dbUrl) {
    console.error(`
❌ SUPABASE_DB_URL / DATABASE_URL / POSTGRES_URL manquant dans .env.local.

Ajoutez la connection string Postgres (Supabase → Settings → Database → Connection string)
puis relancez: node scripts/apply-user-permissions-migration.mjs

Ou exécutez manuellement supabase/migrations/055_user_permissions.sql dans SQL Editor.
`);
    process.exit(1);
  }

  const sqlToRun =
    tableOk && !rpcOk && fs.existsSync(RPC_ONLY_PATH)
      ? fs.readFileSync(RPC_ONLY_PATH, "utf8")
      : fullSql;

  const pg = await import("pg");
  const client = new pg.default.Client({
    connectionString: dbUrl,
    ssl: dbUrl.includes("localhost") ? false : { rejectUnauthorized: false },
  });
  await client.connect();
  console.log("Connexion Postgres établie, application de la migration…");
  await client.query(sqlToRun);
  await client.end();
  console.log("✅ Migration user_permissions appliquée avec succès.");

  if (serviceKey?.startsWith("eyJ")) {
    const supa = createClient(url, serviceKey);
    tableOk = await tableExists(supa);
    rpcOk = await rpcExists(supa);
    console.log(`Vérification — table: ${tableOk ? "OK" : "ÉCHEC"}, RPC: ${rpcOk ? "OK" : "ÉCHEC"}`);
    if (!tableOk || !rpcOk) {
      console.warn("Rechargez le schéma Supabase (Settings → API → Reload) si nécessaire.");
    }
  }
}

main().catch((e) => {
  console.error("Erreur:", e.message ?? e);
  process.exit(1);
});
