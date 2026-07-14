#!/usr/bin/env node
/**
 * Réparation complète connexion FRMT — crée/confirme l'utilisateur, profil admin, test login.
 * Écrit le rapport dans auth-fix-log.txt
 *
 * Usage:
 *   node scripts/ensure-frmt-user.mjs abdou@frmt.ma FrmtAbdou2026!
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = join(root, ".env.local");
const logPath = join(root, "auth-fix-log.txt");

const lines = [];
function log(msg) {
  const line = typeof msg === "string" ? msg : JSON.stringify(msg, null, 2);
  lines.push(line);
  console.log(line);
}

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

function jwtRef(jwt) {
  try {
    const part = jwt.split(".")[1];
    const json = Buffer.from(part.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString();
    return JSON.parse(json).ref ?? null;
  } catch {
    return null;
  }
}

const env = { ...process.env, ...loadEnv(envPath) };
const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const anonKey =
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const email = (process.argv[2] || "abdou@frmt.ma").trim().toLowerCase();
const password = process.argv[3] || "FrmtAbdou2026!";

log("=== Réparation connexion FRMT ===");
log(`Date: ${new Date().toISOString()}`);
log(`Email: ${email}`);
log(`Projet URL: ${url || "(manquant)"}`);

if (!url || !anonKey || !serviceKey) {
  log("ERREUR: .env.local incomplet (URL, anon key, service_role requis)");
  writeFileSync(logPath, lines.join("\n"), "utf8");
  process.exit(1);
}

const urlRef = new URL(url).hostname.split(".")[0];
const anonRef = jwtRef(anonKey);
const serviceRef = jwtRef(serviceKey);
log(`Ref URL: ${urlRef} | Ref anon: ${anonRef} | Ref service: ${serviceRef}`);

if (anonRef && urlRef !== anonRef) {
  log(`ERREUR: clé anon (${anonRef}) ≠ projet URL (${urlRef})`);
  writeFileSync(logPath, lines.join("\n"), "utf8");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// --- Auth user ---
let user;
const { data: list, error: listErr } = await admin.auth.admin.listUsers({ perPage: 1000 });
if (listErr) {
  log(`ERREUR listUsers: ${listErr.message}`);
  writeFileSync(logPath, lines.join("\n"), "utf8");
  process.exit(1);
}

user = list.users.find((u) => u.email?.toLowerCase() === email);

if (!user) {
  log("Utilisateur absent → création...");
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: "Abdou", role: "admin", frmt_role: "admin" },
  });
  if (createErr) {
    log(`ERREUR createUser: ${createErr.message}`);
    writeFileSync(logPath, lines.join("\n"), "utf8");
    process.exit(1);
  }
  user = created.user;
  log(`Créé: ${user.id}`);
} else {
  log(`Utilisateur existant: ${user.id}`);
  const { error: updErr } = await admin.auth.admin.updateUserById(user.id, {
    password,
    email_confirm: true,
  });
  if (updErr) {
    log(`ERREUR updateUser: ${updErr.message}`);
    writeFileSync(logPath, lines.join("\n"), "utf8");
    process.exit(1);
  }
  log("Mot de passe mis à jour + email confirmé");
}

// --- Profile ---
const profPayload = {
  id: user.id,
  email: user.email ?? email,
  full_name: "Abdou",
  role: "admin",
  frmt_role: "admin",
  actif: true,
};

let { error: profErr } = await admin.from("profiles").upsert(profPayload, { onConflict: "id" });
if (profErr?.message?.includes("frmt_role")) {
  const { frmt_role: _, ...minimal } = profPayload;
  ({ error: profErr } = await admin.from("profiles").upsert(minimal, { onConflict: "id" }));
}
if (profErr) {
  log(`AVERTISSEMENT profil: ${profErr.message}`);
  log("Exécutez supabase/AUTORISER_ABDOU_FRMT.sql dans SQL Editor");
} else {
  log("Profil admin OK");
}

// --- Supprimer permissions restrictives ---
await admin.from("user_permissions").delete().eq("user_id", user.id);

// --- Test login anon ---
const pub = createClient(url, anonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: loginData, error: loginErr } = await pub.auth.signInWithPassword({
  email,
  password,
});

if (loginErr) {
  log(`ERREUR login test: ${loginErr.message}`);
  log("Vérifiez Authentication → Providers → Email dans Supabase");
  writeFileSync(logPath, lines.join("\n"), "utf8");
  process.exit(1);
}

log(`LOGIN TEST OK — ${loginData.user?.email}`);

log("");
log("=== CONNEXION APP ===");
log("URL: http://localhost:3000/auth/login");
log(`Email: ${email}`);
log(`Mot de passe: ${password}`);
log("");
log("Redémarrez le serveur: npm run restart");

writeFileSync(logPath, lines.join("\n"), "utf8");
log(`\nRapport: ${logPath}`);
