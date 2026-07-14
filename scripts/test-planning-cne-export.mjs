#!/usr/bin/env node
/**
 * Test serveur — export Planning CNE (colonnes + génération).
 * Usage: node scripts/test-planning-cne-export.mjs
 */
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = join(root, ".env.local");

function loadEnv(path) {
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 1) continue;
    let val = t.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[t.slice(0, i).trim()] = val;
  }
  return out;
}

const env = { ...process.env, ...loadEnv(envPath) };
const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!url || !serviceKey) {
  console.error("❌ .env.local Supabase manquant");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: joueurs } = await admin
  .from("joueurs")
  .select("id, nom, prenom, categorie_age, statut")
  .eq("categorie_age", "Elite Pro")
  .limit(6);

const { data: coaches } = await admin.from("entraineurs").select("id, nom, prenom, statut").limit(12);

const joueurIds = (joueurs ?? []).map((j) => j.id);
const coachIds = (coaches ?? []).slice(0, 3).map((c) => `coach-${c.id}`);
const columnIds = [...joueurIds, ...coachIds];

console.log("\n=== Test export Planning CNE (API) ===\n");
console.log(`Joueurs Elite Pro: ${joueurIds.length}`);
console.log(`Coaches test: ${coachIds.length}`);
console.log(`Colonnes totales: ${columnIds.length}`);

const body = {
  dateDebut: "2026-07-01",
  dateFin: "2026-07-31",
  columnIds,
  displayMode: "both",
  categorieJoueur: "Elite Pro",
};

const base = "http://localhost:3000";

for (const path of ["/api/programmation-joueurs/export/excel", "/api/programmation-joueurs/export/cne-pdf"]) {
  const res = await fetch(`${base}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const ct = res.headers.get("content-type") ?? "";
  if (res.ok) {
    const buf = await res.arrayBuffer();
    console.log(`✅ ${path} → ${res.status} (${buf.byteLength} octets, ${ct})`);
  } else {
    const err = ct.includes("json") ? await res.json() : await res.text();
    console.log(`❌ ${path} → ${res.status}`, err);
  }
}

console.log("\n(Sans cookie session : 401/403 attendu — vérifier message d'erreur)\n");
