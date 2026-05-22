#!/usr/bin/env node
/**
 * Repare le compte FRMT (auth + profil) — une seule commande.
 *
 * .env.local requis :
 *   NEXT_PUBLIC_SUPABASE_URL=...
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ... (service_role)
 *
 * Usage :
 *   node scripts/repair-compte-frmt.mjs email@frmt.ma MotDePasse123
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
const anonKey =
  env.SUPABASE_ANON_KEY?.trim() ||
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

const email = (process.argv[2] || env.FRMT_ACCOUNT_EMAIL || "s.abderrazzaq@frmt.ma").trim();
const password = process.argv[3] || env.FRMT_ACCOUNT_PASSWORD;

console.log("\n=== Reparation compte FRMT ===\n");
console.log("Projet:", url || "(manquant)");
console.log("Email:", email);

if (!url || !serviceKey) {
  console.error("\nERREUR: Ajoutez dans .env.local :");
  console.error("  NEXT_PUBLIC_SUPABASE_URL=https://kcwvqwvcyiiwalyvhvxz.supabase.co");
  console.error("  SUPABASE_SERVICE_ROLE_KEY=eyJ... (Dashboard -> Settings -> API -> service_role)");
  process.exit(1);
}

if (!password || password.length < 6) {
  console.error("\nUsage: node scripts/repair-compte-frmt.mjs email@frmt.ma MotDePasse123");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: list, error: listErr } = await admin.auth.admin.listUsers({ perPage: 1000 });
if (listErr) {
  console.error("listUsers:", listErr.message);
  process.exit(1);
}

let user = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());

if (!user) {
  console.log("Creation utilisateur...");
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: email.toLowerCase(),
    password,
    email_confirm: true,
    user_metadata: { full_name: "FRMT Admin", role: "admin", frmt_role: "admin" },
  });
  if (createErr) {
    console.error("createUser:", createErr.message);
    process.exit(1);
  }
  user = created.user;
} else {
  console.log("Mise a jour utilisateur existant...");
  const { error: updErr } = await admin.auth.admin.updateUserById(user.id, {
    password,
    email_confirm: true,
  });
  if (updErr) {
    console.error("updateUser:", updErr.message);
    process.exit(1);
  }
}

const { error: profErr } = await admin.from("profiles").upsert(
  {
    id: user.id,
    email: user.email ?? email,
    full_name: "FRMT Admin",
    role: "admin",
    frmt_role: "admin",
  },
  { onConflict: "id" }
);

if (profErr) {
  console.error("profiles upsert:", profErr.message);
  console.error("Executez dans Supabase SQL: supabase/migrations/020_auth_compte_frmt.sql");
  process.exit(1);
}

console.log("\nProfil OK - role admin");

if (anonKey) {
  const pub = createClient(url, anonKey);
  const { data, error } = await pub.auth.signInWithPassword({
    email: email.toLowerCase(),
    password,
  });
  if (error) {
    console.error("\nTest login avec cle .env.local: ECHEC");
    console.error(" ", error.message);
    if (anonKey.startsWith("sb_publishable")) {
      console.error("\n>>> Remplacez NEXT_PUBLIC_SUPABASE_ANON_KEY par la cle anon eyJ... (Settings -> API)");
    }
    process.exit(1);
  }
  console.log("\nTest login: OK -", data.user?.email);
} else {
  console.log("\nTest login: impossible (pas de cle anon dans .env.local)");
}

console.log("\n=== TERMINE ===");
console.log("Connectez-vous sur http://localhost:3001/auth/login");
console.log("Email:", email);
console.log("Mot de passe: celui que vous venez de definir\n");
