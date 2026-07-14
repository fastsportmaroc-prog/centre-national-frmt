#!/usr/bin/env node
/**
 * One-shot migration runner — writes MIGRATION_DONE.txt with result.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import { execSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const DONE_PATH = path.join(ROOT, "MIGRATION_DONE.txt");
const SQL_PATH = path.join(ROOT, "supabase/migrations/055_user_permissions.sql");

function writeDone(msg) {
  fs.writeFileSync(DONE_PATH, msg, "utf8");
  console.log(msg);
}

function loadEnvLocal() {
  const envPath = path.join(ROOT, ".env.local");
  if (!fs.existsSync(envPath)) throw new Error(".env.local introuvable");
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
  return false;
}

async function rpcExists(client) {
  const { error } = await client.rpc("get_my_permissions");
  if (!error) return true;
  if (/schema cache|does not exist|could not find/i.test(error.message)) return false;
  return false;
}

async function main() {
  try {
    execSync("npm install pg --no-save", { cwd: ROOT, stdio: "pipe" });
  } catch (e) {
    // pg may already be installed
  }

  loadEnvLocal();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const dbUrl =
    process.env.SUPABASE_DB_URL ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL;

  if (!url || !serviceKey) {
    writeDone("FAILED: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing");
    process.exit(1);
  }

  const client = createClient(url, serviceKey);
  const tableOk = await tableExists(client);
  const rpcOk = await rpcExists(client);

  if (tableOk && rpcOk) {
    writeDone("SUCCESS");
    return;
  }

  if (!dbUrl) {
    // Try supabase CLI
    try {
      execSync("npx supabase link --project-ref kcwvqwvcyiiwalyvhvxz", {
        cwd: ROOT,
        stdio: "pipe",
        timeout: 60000,
      });
      execSync("npx supabase db push", { cwd: ROOT, stdio: "pipe", timeout: 120000 });
      const t2 = await tableExists(client);
      const r2 = await rpcExists(client);
      if (t2 && r2) {
        writeDone("SUCCESS");
        return;
      }
    } catch (cliErr) {
      const msg = cliErr.stderr?.toString() || cliErr.message || String(cliErr);
      writeDone(`FAILED: no DB URL in .env.local and supabase CLI failed: ${msg.slice(0, 500)}`);
      process.exit(1);
    }
    writeDone("FAILED: supabase db push completed but user_permissions table/RPC still missing");
    process.exit(1);
  }

  if (!fs.existsSync(SQL_PATH)) {
    writeDone("FAILED: migration SQL file not found");
    process.exit(1);
  }

  const sql = fs.readFileSync(SQL_PATH, "utf8");
  const pg = await import("pg");
  const pgClient = new pg.default.Client({
    connectionString: dbUrl,
    ssl: dbUrl.includes("localhost") ? false : { rejectUnauthorized: false },
  });
  await pgClient.connect();
  await pgClient.query(sql);
  await pgClient.end();

  const t3 = await tableExists(client);
  const r3 = await rpcExists(client);
  if (t3 && r3) {
    writeDone("SUCCESS");
  } else {
    writeDone("FAILED: SQL applied but table/RPC verification failed — reload schema cache");
    process.exit(1);
  }
}

main().catch((e) => {
  writeDone(`FAILED: ${e.message ?? e}`);
  process.exit(1);
});
