#!/usr/bin/env node
/**
 * Reinitialise le mot de passe d'un utilisateur (API Admin Supabase).
 * NE JAMAIS commiter SUPABASE_SERVICE_ROLE_KEY.
 *
 * Usage:
 *   1. Ajouter dans .env.local (une ligne, cle service_role du dashboard):
 *      SUPABASE_SERVICE_ROLE_KEY=eyJ...
 *   2. node scripts/fix-user-password.mjs email@frmt.ma NouveauMotDePasse123
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
const email = process.argv[2]?.trim();
const newPassword = process.argv[3];

if (!url || !serviceKey) {
  console.error("Manque NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY dans .env.local");
  console.error("Cle service_role : Supabase Dashboard -> Settings -> API -> service_role (secret)");
  process.exit(1);
}

if (!email || !newPassword || newPassword.length < 6) {
  console.error("Usage: node scripts/fix-user-password.mjs email@frmt.ma NouveauMotDePasse123");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: list, error: listError } = await admin.auth.admin.listUsers({
  page: 1,
  perPage: 1000,
});

if (listError) {
  console.error("listUsers:", listError.message);
  process.exit(1);
}

const user = list.users.find(
  (u) => u.email?.toLowerCase() === email.toLowerCase()
);

if (!user) {
  console.error("Aucun utilisateur avec cet email dans le projet", url);
  console.error("Creez-le : Dashboard -> Authentication -> Users -> Add user");
  process.exit(1);
}

const { error: updateError } = await admin.auth.admin.updateUserById(user.id, {
  password: newPassword,
  email_confirm: true,
});

if (updateError) {
  console.error("updateUser:", updateError.message);
  process.exit(1);
}

console.log("OK - Mot de passe mis a jour pour:", user.email);
console.log("Connectez-vous sur http://localhost:3000/auth/login avec ce nouveau mot de passe");
