#!/usr/bin/env node
/**
 * Diagnostic connexion Supabase pour un email.
 * Usage: node scripts/diagnose-auth-user.mjs abdou@frmt.ma [motdepasse]
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
const anonKey =
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const email = (process.argv[2] || "abdou@frmt.ma").trim().toLowerCase();
const password = process.argv[3];

console.log("\n=== Diagnostic auth FRMT ===\n");
console.log("Email:", email);
console.log("Projet:", url || "(manquant)");

if (!url || !anonKey) {
  console.error("\n❌ .env.local incomplet (URL ou clé anon)");
  process.exit(1);
}

const keyKind = anonKey.startsWith("eyJ")
  ? "JWT anon (OK)"
  : anonKey.startsWith("sb_publishable_")
    ? "publishable (peut échouer — préférez eyJ anon)"
    : "inconnue";
console.log("Clé anon:", `${anonKey.slice(0, 12)}… (${keyKind})`);

if (!serviceKey) {
  console.warn("\n⚠️  SUPABASE_SERVICE_ROLE_KEY absente — impossible de lister les utilisateurs");
} else {
  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: list, error: listErr } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (listErr) {
    console.error("\n❌ listUsers:", listErr.message);
    console.error("   Vérifiez SUPABASE_SERVICE_ROLE_KEY (Settings → API → service_role)");
    process.exit(1);
  }

  const user = list.users.find((u) => u.email?.toLowerCase() === email);
  if (!user) {
    console.error(`\n❌ Aucun utilisateur "${email}" dans ce projet Supabase.`);
    console.error("   → Authentication → Users → Add user (cochez Confirm email)");
    console.error(`   → Dashboard: https://supabase.com/dashboard/project/${url.match(/https:\/\/([^.]+)/)?.[1]}/auth/users`);
    process.exit(1);
  }

  console.log("\n✅ Utilisateur trouvé:", user.email);
  console.log("   ID:", user.id);
  console.log("   Email confirmé:", user.email_confirmed_at ? "oui" : "NON — bloque la connexion");

  const { data: profile } = await admin
    .from("profiles")
    .select("role, frmt_role, actif")
    .eq("id", user.id)
    .maybeSingle();

  if (profile) {
    console.log("   Profil:", `role=${profile.role}`, `frmt_role=${profile.frmt_role}`, `actif=${profile.actif}`);
  } else {
    console.warn("   ⚠️  Pas de ligne dans public.profiles — exécutez supabase/AUTORISER_ABDOU_FRMT.sql");
  }

  if (!user.email_confirmed_at) {
    console.log("\n→ Correction auto : confirmation email…");
    const { error: fixErr } = await admin.auth.admin.updateUserById(user.id, {
      email_confirm: true,
    });
    if (fixErr) console.error("   Échec:", fixErr.message);
    else console.log("   ✅ Email confirmé");
  }
}

const pub = createClient(url, anonKey);
if (password) {
  const { data, error } = await pub.auth.signInWithPassword({ email, password });
  if (error) {
    console.error("\n❌ Login test:", error.message);
    console.error("\n→ Réinitialisez le mot de passe :");
    console.error(`   npm run fix:password -- ${email} VotreNouveauPass123`);
    console.error("   ou");
    console.error(`   npm run repair:compte -- ${email} VotreNouveauPass123`);
    process.exit(1);
  }
  console.log("\n✅ Login OK —", data.user?.email);
} else {
  console.log("\n💡 Test login :");
  console.log(`   node scripts/diagnose-auth-user.mjs ${email} VOTRE_MOT_DE_PASSE`);
  console.log("\n💡 Réinitialiser mot de passe :");
  console.log(`   npm run fix:password -- ${email} VotreNouveauPass123`);
}

console.log("");
