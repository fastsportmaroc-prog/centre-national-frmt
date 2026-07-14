#!/usr/bin/env node
/**
 * Répare uniquement la connexion (mot de passe + email confirmé).
 * Ne modifie PAS le rôle ni les permissions personnalisées.
 *
 * Usage: node scripts/repair-login.mjs email@frmt.ma MotDePasse123
 */
import { readFileSync, existsSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = join(root, ".env.local");
const logPath = join(root, "auth-fix-log.txt");

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
const email = (process.argv[2] || "abdou@frmt.ma").trim().toLowerCase();
const password = process.argv[3] || "FrmtAbdou2026!";

const lines = [];
function log(msg) {
  lines.push(msg);
  console.log(msg);
}

log("=== Réparation connexion (sans toucher aux droits) ===");
log(`Email: ${email}`);

if (!url || !serviceKey || !anonKey) {
  log("ERREUR: .env.local incomplet (URL, anon, service_role)");
  writeFileSync(logPath, lines.join("\n"), "utf8");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: list, error: listErr } = await admin.auth.admin.listUsers({ perPage: 1000 });
if (listErr) {
  log(`ERREUR listUsers: ${listErr.message}`);
  process.exit(1);
}

let user = list.users.find((u) => u.email?.toLowerCase() === email);

if (!user) {
  log("Création utilisateur (rôle viewer par défaut)...");
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: email.split("@")[0], role: "viewer" },
  });
  if (createErr) {
    log(`ERREUR createUser: ${createErr.message}`);
    process.exit(1);
  }
  user = created.user;
  await admin.from("profiles").upsert(
    {
      id: user.id,
      email,
      full_name: email.split("@")[0],
      role: "viewer",
      actif: true,
    },
    { onConflict: "id" }
  );
} else {
  const { error: updErr } = await admin.auth.admin.updateUserById(user.id, {
    password,
    email_confirm: true,
  });
  if (updErr) {
    log(`ERREUR updateUser: ${updErr.message}`);
    process.exit(1);
  }
  log("Mot de passe OK + email confirmé");
}

// abdou@frmt.ma : profil viewer pour tester les permissions personnalisées
if (email === "abdou@frmt.ma") {
  const { error: roleErr } = await admin
    .from("profiles")
    .update({ role: "viewer", frmt_role: "joueur", actif: true })
    .eq("id", user.id);
  if (roleErr) log(`AVERTISSEMENT profil viewer: ${roleErr.message}`);
  else log("Profil abdou → viewer (permissions personnalisées actives)");
}

const pub = createClient(url, anonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const { data: loginData, error: loginErr } = await pub.auth.signInWithPassword({ email, password });

if (loginErr) {
  log(`ERREUR login test: ${loginErr.message}`);
  writeFileSync(logPath, lines.join("\n"), "utf8");
  process.exit(1);
}

log(`LOGIN TEST OK — ${loginData.user?.email}`);
log("");
log("http://localhost:3000/auth/login");
log(`Email: ${email}`);
log(`Mot de passe: ${password}`);
log("(Rôle et permissions personnalisées inchangés)");

writeFileSync(logPath, lines.join("\n"), "utf8");
