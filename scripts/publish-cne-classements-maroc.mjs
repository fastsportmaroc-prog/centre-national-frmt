#!/usr/bin/env node
/** Nettoie les juniors + republie les classements Elite Pro. */
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const env = Object.fromEntries(
  readFileSync(join(root, ".env.local"), "utf8")
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

const ELITE_PRO = "Elite Pro";
const UN_CODES = ["U8", "U10", "U12", "U14", "U16", "U18"];

function displayNameForCneJoueur(prenom, nom) {
  return `${prenom ?? ""} ${nom ?? ""}`.replace(/\s+/g, " ").trim();
}

// 1. Nettoyer juniors
const { data: juniors } = await admin
  .from("joueurs")
  .select("id, prenom, nom, classement")
  .in("categorie_age", UN_CODES);

let cleaned = 0;
for (const j of juniors ?? []) {
  await admin.from("classements_externes").delete().eq("joueur_id", j.id).in("categorie", ["ATP", "WTA"]);
  if (/^(ATP|WTA)\s*#/i.test(j.classement ?? "")) {
    await admin.from("joueurs").update({ classement: null }).eq("id", j.id);
    cleaned++;
    console.log(`Nettoyé: ${j.prenom} ${j.nom}`);
  }
}

// 2. Publier Elite Pro depuis relevé marocain
const { data: latest } = await admin
  .from("classements_maroc_scrapes")
  .select("semaine_releve")
  .order("semaine_releve", { ascending: false })
  .limit(1)
  .maybeSingle();
const semaine = latest?.semaine_releve;
if (!semaine) {
  console.log(`Juniors nettoyés: ${cleaned}`);
  process.exit(0);
}

const { data: rows } = await admin
  .from("classements_maroc_scrapes")
  .select("joueur_cne_id, nom_joueur, type_classement, rang, points, date_releve")
  .eq("semaine_releve", semaine)
  .eq("est_membre_cne", true)
  .not("joueur_cne_id", "is", null);

const ids = [...new Set((rows ?? []).map((r) => r.joueur_cne_id))];
const { data: joueurs } = await admin
  .from("joueurs")
  .select("id, prenom, nom, categorie_age")
  .in("id", ids);
const byId = new Map((joueurs ?? []).map((j) => [j.id, j]));

let upserted = 0;
for (const row of rows ?? []) {
  const j = byId.get(row.joueur_cne_id);
  if (!j || (j.categorie_age ?? "").trim() !== ELITE_PRO) continue;

  const nom = displayNameForCneJoueur(j.prenom, j.nom);
  const { data: prev } = await admin
    .from("classements_externes")
    .select("rang")
    .eq("joueur_id", row.joueur_cne_id)
    .eq("categorie", row.type_classement)
    .maybeSingle();

  const previousRang = prev?.rang ?? null;
  const evolution =
    previousRang != null && previousRang > 0 ? previousRang - row.rang : null;

  const payload = {
    joueur_id: row.joueur_cne_id,
    nom_joueur: nom,
    categorie: row.type_classement,
    rang: row.rang,
    points: row.points,
    date_maj: row.date_releve,
    source: "atp-wta-scrape-maroc",
    evolution,
    rang_precedent: previousRang,
  };

  let { error } = await admin.from("classements_externes").upsert(payload, {
    onConflict: "joueur_id,categorie",
  });
  if (error?.message?.includes("evolution")) {
    const { evolution: _e, rang_precedent: _r, ...fallback } = payload;
    ({ error } = await admin.from("classements_externes").upsert(fallback, {
      onConflict: "joueur_id,categorie",
    }));
  }
  if (error) {
    console.error(nom, error.message);
    continue;
  }
  await admin
    .from("joueurs")
    .update({ classement: `${row.type_classement} #${row.rang}` })
    .eq("id", row.joueur_cne_id);
  upserted++;
  console.log(`${nom}: ${row.type_classement} #${row.rang}`);
}

console.log(`OK — ${cleaned} junior(s) nettoyé(s), ${upserted} Elite Pro publié(s)`);
