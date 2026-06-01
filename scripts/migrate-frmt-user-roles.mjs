#!/usr/bin/env node
/**
 * Migration ciblée des rôles FRMT V2 (table public.profiles).
 *
 * Usage :
 *   node scripts/migrate-frmt-user-roles.mjs          # dry-run (lecture seule)
 *   node scripts/migrate-frmt-user-roles.mjs --apply  # applique les mises à jour
 */
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const APPLY = process.argv.includes("--apply");
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = join(root, ".env.local");

const ADMIN_EMAIL = "m.aitbarhouch@frmt.ma";
const DEMOTE_EMAIL = "s.abderrazzaq@frmt.ma";

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
  console.error("Manque NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY dans .env.local");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

let hasFrmtRole = true;

async function detectColumns() {
  const probe = await admin.from("profiles").select("role, frmt_role").limit(1);
  if (probe.error?.message?.includes("frmt_role")) {
    hasFrmtRole = false;
    console.log("Note: colonne frmt_role absente — migration sur profiles.role uniquement.\n");
  }
}

function profileFields() {
  return hasFrmtRole ? "id, email, role, frmt_role, actif, full_name" : "id, email, role, actif, full_name";
}

async function fetchProfiles(filter) {
  let q = admin.from("profiles").select(profileFields());
  if (filter?.emails?.length) {
    q = q.in(
      "email",
      filter.emails.map((e) => e.toLowerCase())
    );
  }
  const { data, error } = await q.order("email");
  if (error) throw new Error(error.message);
  return data ?? [];
}

async function fetchDirecteurUsers() {
  let q = admin.from("profiles").select(profileFields());
  if (hasFrmtRole) {
    q = q.or("role.eq.directeur,frmt_role.eq.directeur");
  } else {
    q = q.eq("role", "directeur");
  }
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data ?? [];
}

async function updateProfile(id, patch) {
  const { data, error } = await admin.from("profiles").update(patch).eq("id", id).select().single();
  if (error) throw new Error(error.message);
  return data;
}

function printRows(label, rows) {
  console.log(`\n--- ${label} (${rows.length}) ---`);
  for (const r of rows) {
    const frmt = hasFrmtRole ? ` | frmt_role=${r.frmt_role ?? "—"}` : "";
    console.log(
      `  ${r.email ?? r.id} | role=${r.role ?? "—"}${frmt} | actif=${r.actif ?? "—"}`
    );
  }
}

console.log(`\n=== Migration rôles FRMT V2 ${APPLY ? "(APPLY)" : "(DRY-RUN)"} ===\n`);
await detectColumns();

const beforeTargets = await fetchProfiles({ emails: [ADMIN_EMAIL, DEMOTE_EMAIL] });
const beforeDirecteur = await fetchDirecteurUsers();
const beforeAll = await fetchProfiles({});

printRows("Cibles AVANT", beforeTargets);
printRows('Utilisateurs "directeur" AVANT', beforeDirecteur);

if (!APPLY) {
  console.log("\nDry-run terminé. Relancez avec --apply pour appliquer.");
  process.exit(0);
}

// 1) Promouvoir admin
const adminRow = beforeTargets.find((r) => r.email?.toLowerCase() === ADMIN_EMAIL);
if (adminRow) {
  const patch = { role: "admin", actif: true };
  if (hasFrmtRole) patch.frmt_role = "admin";
  await updateProfile(adminRow.id, patch);
  console.log(`\nOK promote ${ADMIN_EMAIL} → admin`);
} else {
  console.warn(`\nWARN: ${ADMIN_EMAIL} introuvable dans profiles`);
}

// 2) Rétrograder s.abderrazzaq
const demoteRow = beforeTargets.find((r) => r.email?.toLowerCase() === DEMOTE_EMAIL);
if (demoteRow) {
  const patch = { role: "viewer", actif: true };
  if (hasFrmtRole) patch.frmt_role = "joueur";
  await updateProfile(demoteRow.id, patch);
  console.log(`OK demote ${DEMOTE_EMAIL} → viewer`);
} else {
  console.warn(`WARN: ${DEMOTE_EMAIL} introuvable dans profiles`);
}

// 3) Migrer tous les directeur restants
let legacyQuery = admin.from("profiles").select(profileFields()).eq("role", "directeur");
if (hasFrmtRole) {
  legacyQuery = admin
    .from("profiles")
    .select(profileFields())
    .or("role.eq.directeur,frmt_role.eq.directeur");
}
const { data: legacy, error: legacyErr } = await legacyQuery;
if (legacyErr) throw new Error(legacyErr.message);

for (const row of legacy ?? []) {
  const email = row.email?.toLowerCase() ?? "";
  if (email === ADMIN_EMAIL || email === DEMOTE_EMAIL) continue;

  const nextRole =
    row.role === "admin" ? "admin" : row.role === "entraineur" ? "entraineur" : "direction";
  const patch = { role: row.role === "directeur" ? nextRole : row.role };
  if (hasFrmtRole && row.frmt_role === "directeur") {
    patch.frmt_role =
      nextRole === "admin" ? "admin" : nextRole === "entraineur" ? "entraineur" : "logisticien";
  }
  await updateProfile(row.id, patch);
  console.log(`OK migrate ${row.email} → role=${patch.role}${hasFrmtRole ? `, frmt_role=${patch.frmt_role ?? row.frmt_role}` : ""}`);
}

await admin.from("profiles").update({ role: "direction" }).eq("role", "directeur");
if (hasFrmtRole) {
  await admin.from("profiles").update({ frmt_role: "logisticien" }).eq("frmt_role", "directeur");
}

const afterTargets = await fetchProfiles({ emails: [ADMIN_EMAIL, DEMOTE_EMAIL] });
const afterDirecteur = await fetchDirecteurUsers();

printRows("Cibles APRÈS", afterTargets);
printRows('Utilisateurs "directeur" APRÈS', afterDirecteur);

const adminOk = afterTargets.some(
  (r) => r.email?.toLowerCase() === ADMIN_EMAIL && r.role === "admin"
);
const demoteOk = afterTargets.some(
  (r) =>
    r.email?.toLowerCase() === DEMOTE_EMAIL &&
    r.role === "viewer" &&
    r.role !== "directeur" &&
    (!hasFrmtRole || r.frmt_role !== "directeur")
);
const noDirecteur = afterDirecteur.length === 0;

console.log("\n=== Vérifications ===");
console.log(`  ${ADMIN_EMAIL} = admin : ${adminOk ? "OK" : "ÉCHEC"}`);
console.log(`  ${DEMOTE_EMAIL} sans rôle directeur/admin : ${demoteOk ? "OK" : "ÉCHEC"}`);
console.log(`  Aucun directeur en base : ${noDirecteur ? "OK" : "ÉCHEC"}`);

if (!adminOk || !demoteOk || !noDirecteur) process.exit(1);
console.log("\nMigration terminée avec succès.\n");
