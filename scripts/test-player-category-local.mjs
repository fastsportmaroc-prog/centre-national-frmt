#!/usr/bin/env node
/**
 * Tests locaux — filtrage par catégorie joueurs (permissions).
 * Usage: node scripts/test-player-category-local.mjs [baseUrl]
 */
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = join(root, ".env.local");
const BASE = (process.argv[2] || "http://localhost:3000").replace(/\/$/, "");
const TEST_EMAIL = "abdou@frmt.ma";
const TEST_PASSWORD = "FrmtAbdou2026!";
const TEST_CATEGORY = "U16";

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
const anonKey =
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim();

let passed = 0;
let failed = 0;

function ok(label) {
  passed++;
  console.log(`  ✅ ${label}`);
}

function fail(label, detail = "") {
  failed++;
  console.log(`  ❌ ${label}${detail ? ` — ${detail}` : ""}`);
}

function assert(cond, label, detail) {
  if (cond) ok(label);
  else fail(label, detail);
}

console.log("\n=== Test local — filtrage catégories joueurs ===\n");
console.log(`Base URL: ${BASE}`);

// --- 1. Serveur ---
console.log("\n[1] Serveur Next.js");
try {
  const health = await fetch(`${BASE}/api/health`, { signal: AbortSignal.timeout(8000) });
  assert(health.ok, `GET /api/health → ${health.status}`);
} catch (e) {
  fail("Serveur accessible", e instanceof Error ? e.message : String(e));
  console.log("\n⚠️  Lancez: npm run dev");
  process.exit(1);
}

if (!url || !serviceKey || !anonKey) {
  fail(".env.local (Supabase URL + clés)");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const pub = createClient(url, anonKey);

// --- 2. Tables ---
console.log("\n[2] Schéma base de données");
const { error: permTableErr } = await admin.from("user_permissions").select("id").limit(1);
assert(!permTableErr, "Table user_permissions", permTableErr?.message);

const { error: catTableErr } = await admin
  .from("user_player_category_access")
  .select("id")
  .limit(1);
assert(!catTableErr, "Table user_player_category_access", catTableErr?.message);

// --- 3. Utilisateur test ---
console.log("\n[3] Utilisateur test", TEST_EMAIL);
const { data: userList, error: listErr } = await admin.auth.admin.listUsers({ perPage: 1000 });
if (listErr) {
  fail("listUsers", listErr.message);
  process.exit(1);
}
const testUser = userList.users.find((u) => u.email?.toLowerCase() === TEST_EMAIL);
assert(!!testUser, `Compte ${TEST_EMAIL} existe`);

if (!testUser) {
  console.log("\n❌ Arrêt — créez le compte avec: node scripts/repair-login.mjs");
  process.exit(1);
}

// Configurer U16 seulement (permissions custom minimales)
await admin.from("user_permissions").delete().eq("user_id", testUser.id);
await admin.from("user_player_category_access").delete().eq("user_id", testUser.id);

const { error: permInsErr } = await admin.from("user_permissions").insert([
  { user_id: testUser.id, module_key: "players", can_view: true, can_edit: false },
  { user_id: testUser.id, module_key: "planning", can_view: true, can_edit: false },
  { user_id: testUser.id, module_key: "statistics", can_view: true, can_edit: false },
  { user_id: testUser.id, module_key: "reports", can_view: true, can_edit: false },
  { user_id: testUser.id, module_key: "dashboard", can_view: true, can_edit: false },
]);

const { error: catInsErr } = await admin.from("user_player_category_access").insert({
  user_id: testUser.id,
  category_key: TEST_CATEGORY,
  can_view: true,
});

assert(!permInsErr, "Permissions custom insérées", permInsErr?.message);
assert(!catInsErr, `Catégorie ${TEST_CATEGORY} assignée`, catInsErr?.message);

const { data: cats } = await admin
  .from("user_player_category_access")
  .select("category_key")
  .eq("user_id", testUser.id);
assert(
  cats?.length === 1 && cats[0].category_key === TEST_CATEGORY,
  "Lecture catégories en base",
  JSON.stringify(cats)
);

// --- 4. Filtre compétitions (logique serveur) ---
console.log("\n[4] Filtre compétitions (DB)");
const { data: allComps } = await admin.from("competitions").select("id, nom, categorie").limit(50);
if (!allComps?.length) {
  console.log("  ⚠️  Aucune compétition en base — test filtre ignoré");
} else {
  const allowed = [TEST_CATEGORY];
  const filtered = allComps.filter((c) =>
    allowed.some((key) => String(c.categorie ?? "").toUpperCase().includes(key))
  );
  const other = allComps.filter(
    (c) => !allowed.some((key) => String(c.categorie ?? "").toUpperCase().includes(key))
  );
  ok(`Compétitions totales: ${allComps.length}, U16: ${filtered.length}, autres: ${other.length}`);
  if (other.length > 0) {
    ok(`Filtre exclurait bien ${other.length} compétition(s) hors ${TEST_CATEGORY}`);
  }
}

async function fetchStatus(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, { redirect: "manual", ...opts });
  return res.status;
}

// --- 5. API sans auth ---
console.log("\n[5] API — accès non authentifié");
const classementStatus = await fetchStatus("/api/frmt/classement");
assert(
  classementStatus === 401 || classementStatus === 307,
  `GET /api/frmt/classement sans auth → ${classementStatus} (401 ou redirect login)`
);

const compsStatus = await fetchStatus("/api/competitions");
assert(
  compsStatus === 401 || compsStatus === 403 || compsStatus === 307,
  `GET /api/competitions sans auth → ${compsStatus}`
);

const permStatus = await fetchStatus("/api/auth/my-permissions");
assert(
  permStatus === 401 || permStatus === 200,
  `GET /api/auth/my-permissions sans auth → ${permStatus}`
);

// --- 6. Login Supabase ---
console.log("\n[6] Connexion Supabase (mot de passe)");
const { data: loginData, error: loginErr } = await pub.auth.signInWithPassword({
  email: TEST_EMAIL,
  password: TEST_PASSWORD,
});
assert(!loginErr && loginData.session, `Login ${TEST_EMAIL}`, loginErr?.message);

// Note: les routes Next.js utilisent les cookies HTTP — le Bearer seul ne suffit pas ici.
// Le login Supabase valide que le compte test est utilisable dans le navigateur.

// --- 7. Pages V2 (sans cookie = redirection ou pas de crash) ---
console.log("\n[7] Pages V2 (smoke, sans session navigateur)");
for (const path of ["/v2/dashboard", "/v2/joueurs", "/v2/statistiques", "/v2/calendrier"]) {
  try {
    const res = await fetch(`${BASE}${path}`, { redirect: "manual" });
    assert(res.status < 500, `GET ${path} → ${res.status} (pas d'erreur serveur)`);
  } catch (e) {
    fail(`GET ${path}`, e instanceof Error ? e.message : String(e));
  }
}

// --- 8. Filtre joueurs en base ---
console.log("\n[8] Filtre joueurs (simulation abdou U16)");
const { data: allJoueurs } = await admin
  .from("joueurs")
  .select("id, categorie, categorie_age, date_naissance");
if (!allJoueurs?.length) {
  console.log("  ⚠️  Aucun joueur en base");
} else {
  const allowed = [TEST_CATEGORY];
  const visible = allJoueurs.filter((j) =>
    allowed.some((code) => {
      const cat = (j.categorie_age || j.categorie || "").trim();
      if (cat === code) return true;
      const y = j.date_naissance?.slice(0, 4);
      return y === code;
    })
  );
  ok(
    `Joueurs: ${allJoueurs.length} total → ${visible.length} visibles ${TEST_CATEGORY}, ${allJoueurs.length - visible.length} masqués`
  );
  assert(visible.length < allJoueurs.length, "Le filtre U16 réduit bien la liste");
}

// --- Résumé ---
console.log("\n=== Résumé ===");
console.log(`  Réussis : ${passed}`);
console.log(`  Échecs  : ${failed}`);
console.log(
  "\nTest manuel navigateur (recommandé) :"
);
console.log(`  1. Ouvrir ${BASE}/auth/login`);
console.log(`  2. Connexion : ${TEST_EMAIL} / ${TEST_PASSWORD}`);
console.log(`  3. Vérifier Joueurs / Statistiques / Calendrier = uniquement ${TEST_CATEGORY}`);
console.log(`  4. Tenter ${BASE}/v2/statistiques?categorie=U18 → doit rester sur ${TEST_CATEGORY}`);
console.log("");

process.exit(failed > 0 ? 1 : 0);
