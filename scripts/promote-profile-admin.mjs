#!/usr/bin/env node
/**
 * Met un compte en admin dans public.profiles — SANS passer par le SQL Editor Supabase.
 * Utilise l'URL du projet (*.supabase.co), pas api.supabase.com.
 *
 * .env.local :
 *   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ...
 *
 * Usage :
 *   node scripts/promote-profile-admin.mjs
 *   node scripts/promote-profile-admin.mjs s.abderrazzaq@frmt.ma
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
const email = (process.argv[2] || "s.abderrazzaq@frmt.ma").trim().toLowerCase();
const knownUid = process.argv[3]?.trim() || "";

console.log("\n=== Promotion admin (profiles) ===\n");
console.log("Projet:", url || "(manquant)");
console.log("Email:", email);

if (!url || !serviceKey) {
  console.error("\nERREUR — ajoutez dans .env.local :");
  console.error("  NEXT_PUBLIC_SUPABASE_URL=https://VOTRE_REF.supabase.co");
  console.error("  SUPABASE_SERVICE_ROLE_KEY=eyJ...  (Settings → API → service_role)");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

let userId = knownUid || null;

const { data: list, error: listErr } = await admin.auth.admin.listUsers({ perPage: 1000 });
if (listErr) {
  console.error("listUsers:", listErr.message);
  process.exit(1);
}
const found = list.users.find((u) => u.email?.toLowerCase() === email);
if (!found) {
  console.error("\nAucun utilisateur Auth avec cet email. Créez-le dans Authentication → Users.");
  process.exit(1);
}
userId = found.id;
console.log("UID Auth:", userId);

async function upsertProfile(payload) {
  return admin.from("profiles").upsert(payload, { onConflict: "id" }).select().single();
}

let row = {
  id: userId,
  email,
  full_name: "Administrateur FRMT",
  role: "admin",
  frmt_role: "admin",
  actif: true,
};

let { data, error } = await upsertProfile(row);

if (error?.message?.includes("frmt_role")) {
  console.warn("Colonne frmt_role absente — mise à jour sans frmt_role.");
  const { frmt_role: _, ...minimal } = row;
  ({ data, error } = await upsertProfile(minimal));
}

if (error?.message?.includes("actif")) {
  const { actif: _, frmt_role: __, ...core } = row;
  ({ data, error } = await upsertProfile({ id: userId, email, role: "admin" }));
}

if (error) {
  console.error("\nECHEC profiles:", error.message);
  if (error.message.includes("does not exist")) {
    console.error("\nLa table profiles est absente — exécutez les migrations du dossier supabase/migrations.");
  }
  process.exit(1);
}

console.log("\nOK — profil admin :");
console.log(JSON.stringify(data, null, 2));
console.log("\nDéconnectez-vous puis reconnectez-vous sur l'app.\n");
