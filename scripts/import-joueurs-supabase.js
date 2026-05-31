#!/usr/bin/env node
/**
 * Import joueurs FRMT → Supabase (table joueurs)
 * Lit output/joueurs-frmt.json
 *
 * Usage:
 *   node scripts/import-joueurs-supabase.js --dry-run   (défaut — simulation)
 *   node scripts/import-joueurs-supabase.js --execute   (INSERT réels)
 *
 * Déduplication: nom + prénom + date_naissance (insensible à la casse)
 * Ne s'exécute pas automatiquement — lancer --execute après validation du JSON.
 */
const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const JSON_PATH = path.join(__dirname, "..", "output", "joueurs-frmt.json");
const DRY_RUN = !process.argv.includes("--execute");

function getArg(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : null;
}

function loadEnvLocal() {
  const envPath = path.join(__dirname, "..", ".env.local");
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

function norm(s) {
  return String(s ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

function dedupeKey(j) {
  return `${norm(j.nom)}|${norm(j.prenom)}|${j.date_naissance}`;
}

function mapCategorieAge(cat) {
  const c = String(cat || "").toUpperCase();
  if (c === "JUNIOR") return "Senior";
  if (["U8", "U10", "U12", "U14", "U16", "U18", "Senior"].includes(c)) return c;
  return "U16";
}

function mapSexe(sexe) {
  return sexe === "F" ? "F" : "M";
}

async function createImportClient() {
  loadEnvLocal();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url) {
    console.error("NEXT_PUBLIC_SUPABASE_URL manquant dans .env.local");
    process.exit(1);
  }

  if (serviceKey && serviceKey.startsWith("eyJ") && serviceKey.length > 50) {
    console.log("Client: service_role (import local — bypass RLS)");
    return createClient(url, serviceKey);
  }

  if (!anonKey) {
    console.error("NEXT_PUBLIC_SUPABASE_ANON_KEY manquant");
    process.exit(1);
  }

  const client = createClient(url, anonKey);
  const email = getArg("--email") || process.env.FRMT_IMPORT_EMAIL;
  const password = getArg("--password") || process.env.FRMT_IMPORT_PASSWORD;

  if (email && password) {
    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error) {
      console.error("Login échoué:", error.message);
      process.exit(1);
    }
    console.log("Client: authenticated (", email, ")");
    return client;
  }

  console.warn(
    "⚠ Client anon sans session — INSERT peut échouer (RLS).\n" +
      "  → Décommentez SUPABASE_SERVICE_ROLE_KEY dans .env.local\n" +
      "  → ou: node scripts/import-joueurs-supabase.js --execute --email vous@frmt.ma --password ***\n" +
      "  → ou exécutez supabase/fix-rls-data-tables.sql dans Supabase Studio"
  );
  return client;
}

async function main() {
  if (!fs.existsSync(JSON_PATH)) {
    console.error(`Fichier absent: ${JSON_PATH}`);
    console.error("Lancez d'abord: node scripts/scraper-frmt.js");
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(JSON_PATH, "utf8"));
  const joueurs = Array.isArray(raw) ? raw : raw.players ?? raw.joueurs ?? [];
  if (joueurs.length === 0) {
    console.error("JSON vide — rien à importer");
    process.exit(1);
  }

  console.log(DRY_RUN ? "=== MODE SIMULATION (--dry-run) ===" : "=== MODE EXECUTION (--execute) ===");
  console.log(`Source: ${JSON_PATH} (${joueurs.length} entrées)`);

  const supabase = await createImportClient();

  const { data: existing, error: readErr } = await supabase
    .from("joueurs")
    .select("id, nom, prenom, date_naissance");

  if (readErr) {
    console.error("Lecture joueurs:", readErr.message);
    process.exit(1);
  }

  const existingKeys = new Set(
    (existing ?? []).map((j) =>
      `${norm(j.nom)}|${norm(j.prenom)}|${String(j.date_naissance ?? "").slice(0, 10)}`
    )
  );

  const toInsert = [];
  const skipped = [];

  for (const j of joueurs) {
    const key = dedupeKey(j);
    if (existingKeys.has(key)) {
      skipped.push(j);
      continue;
    }
    existingKeys.add(key);
    toInsert.push({
      nom: j.nom.trim(),
      prenom: j.prenom.trim(),
      date_naissance: j.date_naissance,
      sexe: mapSexe(j.sexe),
      categorie_age: mapCategorieAge(j.categorie),
      statut: "actif",
      nationalite: "Maroc",
      is_frmt_tracked: true,
      is_marocain: true,
      notes: j.club ? `Club FRMT: ${j.club}` : "Import scraper FRMT WB27",
    });
  }

  console.log(`Nouveaux à insérer: ${toInsert.length}`);
  console.log(`Déjà en base (ignorés): ${skipped.length}`);

  if (toInsert.length === 0) {
    console.log("Aucun insert nécessaire.");
    return;
  }

  console.log("\nÉchantillon inserts:");
  console.log(JSON.stringify(toInsert.slice(0, 3), null, 2));

  if (DRY_RUN) {
    console.log("\n→ Validation OK ? Relancez avec --execute pour insérer.");
    return;
  }

  let inserted = 0;
  const batchSize = 20;
  for (let i = 0; i < toInsert.length; i += batchSize) {
    const batch = toInsert.slice(i, i + batchSize);
    const { data, error } = await supabase.from("joueurs").insert(batch).select("id");
    if (error) {
      console.error(`Batch ${i / batchSize + 1} erreur:`, error.message, error.code ?? "");
      if (error.code === "42501") {
        console.error(
          "\nRLS bloque l'insert. Ajoutez SUPABASE_SERVICE_ROLE_KEY dans .env.local puis relancez."
        );
        process.exit(1);
      }
      continue;
    }
    inserted += data?.length ?? batch.length;
    console.log(`Batch ${i / batchSize + 1}: +${data?.length ?? batch.length}`);
  }

  console.log(`\nTerminé: ${inserted} joueur(s) inséré(s) dans Supabase.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
