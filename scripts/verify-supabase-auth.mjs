#!/usr/bin/env node
/**
 * Vérifie .env.local + connexion Supabase Auth (sans toucher aux données).
 * Usage: node scripts/verify-supabase-auth.mjs [email] [password]
 */
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = join(root, ".env.local");

function loadEnvFile(path) {
  if (!existsSync(path)) return {};
  const text = readFileSync(path, "utf8");
  const out = {};
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 1) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

const env = { ...process.env, ...loadEnvFile(envPath) };
const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const key =
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

console.log("=== Vérification Supabase FRMT ===\n");
console.log("Fichier .env.local:", existsSync(envPath) ? "OK" : "MANQUANT");
console.log("URL:", url || "(vide)");
console.log(
  "Clé:",
  key ? `${key.slice(0, 14)}… (${key.length} car.)` : "(vide)"
);

if (!url || !key) {
  console.error("\n❌ Configurez NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY");
  process.exit(1);
}

if (key.startsWith("sb_publishable_")) {
  console.log("Type cle : publishable (OK pour demarrer, testez le login)");
}

const supabase = createClient(url, key);
const { data: health, error: healthErr } = await supabase.auth.getSession();
if (healthErr) {
  console.warn("getSession:", healthErr.message);
} else {
  console.log("Client Supabase:", "OK");
}

const testEmail = process.argv[2];
const testPassword = process.argv[3];

if (testEmail && testPassword) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: testEmail.trim(),
    password: testPassword,
  });
  if (error) {
    console.error("\n❌ Login test:", error.message);
    process.exit(1);
  }
  console.log("\n✅ Login test OK — utilisateur:", data.user?.email);
} else {
  console.log(
    "\n💡 Test login complet : node scripts/verify-supabase-auth.mjs email@frmt.ma motdepasse"
  );
}

console.log("\n✅ Configuration Supabase valide pour l'app.");
