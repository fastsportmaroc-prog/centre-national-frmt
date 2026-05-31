/* Vérifie écriture stage dans Supabase (stages_programme) */
const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

function loadEnvLocal() {
  const envPath = path.join(__dirname, "..", ".env.local");
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    process.env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
}

loadEnvLocal();

const client = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const TEST_NAME = "Stage Validation Supabase " + new Date().toISOString().slice(0, 16);

async function main() {
  const payload = {
    source: "FRMT",
    categorie: "U16",
    stage_action: TEST_NAME,
    date_debut: "2026-06-02",
    date_fin: "2026-06-08",
    nombre_joueurs: 6,
    nombre_encadrants: 2,
    hebergement: true,
    chambres: 2,
    lieu: "Centre National FRMT",
    notes: "Test connexion Supabase script",
    statut: "prevu",
    infrastructure_ids: [],
    entraineur_ids: [],
    materiel_assignations: [],
  };

  const { data, error } = await client.from("stages_programme").insert(payload).select().single();
  if (error) {
    console.error("INSERT ERREUR:", error.message, error.code);
    process.exit(1);
  }
  console.log("INSERT OK id=", data.id);

  const { data: read, error: readErr } = await client
    .from("stages_programme")
    .select("id, stage_action")
    .eq("id", data.id)
    .single();
  if (readErr) {
    console.error("READ ERREUR:", readErr.message);
    process.exit(1);
  }
  console.log("READ OK:", read.stage_action);

  const { error: delErr } = await client.from("stages_programme").delete().eq("id", data.id);
  if (delErr) console.warn("Cleanup skip:", delErr.message);
  else console.log("Cleanup OK (stage test supprimé)");
}

main();
