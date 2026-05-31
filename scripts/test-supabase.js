/* Test connexion Supabase — usage: node scripts/test-supabase.js */
const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

function loadEnvLocal() {
  const envPath = path.join(__dirname, "..", ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("ERREUR: NEXT_PUBLIC_SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_ANON_KEY manquant");
  process.exit(1);
}

const client = createClient(url, key);

async function testTable(tableName) {
  const { data, error } = await client.from(tableName).select("id").limit(1);
  if (error) {
    console.error(`ERREUR (${tableName}):`, error.message, error.code ? `[${error.code}]` : "");
    return false;
  }
  console.log(`CONNEXION OK — table "${tableName}" accessible (${data?.length ?? 0} ligne(s) lue(s))`);
  return true;
}

async function test() {
  console.log("URL:", url);
  console.log("Test SELECT…");
  const okStages = await testTable("stages");
  if (!okStages) {
    console.log("Fallback test sur stages_programme (schéma app existant)…");
    await testTable("stages_programme");
  }
}

test().catch((e) => {
  console.error("ERREUR réseau:", e.message);
  process.exit(1);
});
