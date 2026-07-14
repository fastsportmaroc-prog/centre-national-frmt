#!/usr/bin/env node
/** Audit sélection joueurs pour sync classements — point 1 du diagnostic */
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = join(root, ".env.local");
const env = Object.fromEntries(
  readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .filter((l) => l.trim() && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")];
    })
);

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const JUNIOR_CODES = new Set(["U8", "U10", "U12", "U14", "U16", "U18"]);
const ELITE_PRO = "Elite Pro";

function normSexe(s) {
  return (s ?? "").toString().trim().toUpperCase();
}

function isHomme(s) {
  const x = normSexe(s);
  return x === "M" || x === "H" || x === "HOMME";
}

function isFemme(s) {
  const x = normSexe(s);
  return x === "F" || x === "FEMME";
}

// === Requête ACTUELLE (sync-classements.server.ts + edge function) ===
const current = await admin
  .from("joueurs")
  .select("id, nom, prenom, date_naissance, sexe, categorie_age, statut")
  .or("statut.is.null,statut.eq.actif");

if (current.error) {
  console.error(current.error);
  process.exit(1);
}

const all = current.data ?? [];

console.log("═══════════════════════════════════════════════════════════");
console.log("POINT 1 — SÉLECTION JOUEURS SOURCE (état actuel du code)");
console.log("═══════════════════════════════════════════════════════════");
console.log("");
console.log("Requête utilisée (sync-classements.server.ts) :");
console.log('  FROM joueurs');
console.log('  SELECT id, nom, prenom, date_naissance, sexe, categorie_age, external_*');
console.log('  WHERE statut IS NULL OR statut = \'actif\'');
console.log("  + filtre éligibilité : Elite Pro → ATP/WTA, U8–U18 → ITF Junior");
console.log("");
console.log("Total récupéré :", all.length);

const byCat = {};
for (const j of all) {
  const c = (j.categorie_age ?? "(vide)").trim();
  byCat[c] = (byCat[c] || 0) + 1;
}
console.log("\nRépartition categorie_age :");
for (const [k, v] of Object.entries(byCat).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(v).padStart(3)} × ${k}`);
}

const elitePro = all.filter((j) => (j.categorie_age ?? "").trim() === ELITE_PRO);
const juniors = all.filter((j) => JUNIOR_CODES.has((j.categorie_age ?? "").trim()));
const eliteHommes = elitePro.filter((j) => isHomme(j.sexe));
const eliteFemmes = elitePro.filter((j) => isFemme(j.sexe));
const eliteSansSexe = elitePro.filter((j) => !isHomme(j.sexe) && !isFemme(j.sexe));

const currentEligible = all.filter((j) => isHomme(j.sexe) || isFemme(j.sexe));

console.log("\n───────────────────────────────────────────────────────────");
console.log("CE QUE LE CODE FAIT (après correctif éligibilité)");
console.log("───────────────────────────────────────────────────────────");
console.log(`  Elite Pro + Homme  → ATP         : ${eliteHommes.length}`);
console.log(`  Elite Pro + Femme  → WTA         : ${eliteFemmes.length}`);
console.log(`  U8–U18             → ITF Junior  : ${juniors.length}`);
console.log(`  TOTAL éligible sync : ${eliteHommes.length + eliteFemmes.length + juniors.length}`);

if (eliteSansSexe.length) {
  console.log(`  ⚠ Elite Pro sans sexe M/F : ${eliteSansSexe.length}`);
}

console.log("\n═══════════════════════════════════════════════════════════");
console.log("LISTE Elite Pro — Hommes (ATP attendu)");
console.log("═══════════════════════════════════════════════════════════");
for (const j of eliteHommes.sort((a, b) => (a.nom ?? "").localeCompare(b.nom ?? ""))) {
  console.log(`  • ${(j.prenom ?? "").trim()} ${(j.nom ?? "").trim()}  [sexe=${j.sexe ?? "?"}]`);
}
if (!eliteHommes.length) console.log("  (aucun)");

console.log("\n═══════════════════════════════════════════════════════════");
console.log("LISTE Elite Pro — Femmes (WTA attendu)");
console.log("═══════════════════════════════════════════════════════════");
for (const j of eliteFemmes.sort((a, b) => (a.nom ?? "").localeCompare(b.nom ?? ""))) {
  console.log(`  • ${(j.prenom ?? "").trim()} ${(j.nom ?? "").trim()}  [sexe=${j.sexe ?? "?"}]`);
}
if (!eliteFemmes.length) console.log("  (aucun)");

console.log("\n═══════════════════════════════════════════════════════════");
console.log("LISTE Juniors U8–U18 (ITF Junior attendu)");
console.log("═══════════════════════════════════════════════════════════");
for (const j of juniors.sort((a, b) => (a.categorie_age ?? "").localeCompare(b.categorie_age ?? ""))) {
  console.log(
    `  • ${(j.prenom ?? "").trim()} ${(j.nom ?? "").trim()}  [${j.categorie_age}] sexe=${j.sexe ?? "?"}`
  );
}
if (!juniors.length) console.log("  (aucun)");

console.log("\n═══════════════════════════════════════════════════════════");
console.log("JOUEURS ACTIFS HORS Elite Pro / Junior (sync actuelle les inclut)");
console.log("═══════════════════════════════════════════════════════════");
const horsCible = all.filter(
  (j) =>
    (j.categorie_age ?? "").trim() !== ELITE_PRO &&
    !JUNIOR_CODES.has((j.categorie_age ?? "").trim()) &&
    (isHomme(j.sexe) || isFemme(j.sexe))
);
console.log(`  Count : ${horsCible.length} (traités à tort ou en trop selon votre règle métier)`);
for (const j of horsCible.slice(0, 15)) {
  console.log(
    `  • ${(j.prenom ?? "").trim()} ${(j.nom ?? "").trim()}  [cat=${j.categorie_age ?? "?"}]`
  );
}
if (horsCible.length > 15) console.log(`  … et ${horsCible.length - 15} autres`);

const ce = await admin.from("classements_externes").select("nom_joueur,categorie,rang").order("rang");
console.log("\n═══════════════════════════════════════════════════════════");
console.log("CLASSEMENTS_EXTERNES en base :", ce.data?.length ?? 0);
console.log("═══════════════════════════════════════════════════════════");
for (const r of ce.data ?? []) {
  console.log(`  ${r.categorie} #${r.rang} — ${r.nom_joueur}`);
}
