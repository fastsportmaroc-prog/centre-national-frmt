#!/usr/bin/env node
/**
 * Recalcule joueur_cne_id / est_membre_cne sur TOUT l'historique marocain,
 * puis republie le dernier relevé vers classements_externes.
 */
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

function normalizeName(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function atpSlugFromSourceId(sourcePlayerId) {
  if (!sourcePlayerId) return "";
  return sourcePlayerId.split("/")[0] ?? "";
}

function initialFromAbbreviatedDisplay(display) {
  const m = display.trim().match(/^([A-Za-z])/);
  return m ? normalizeName(m[1]) : null;
}

function prenomMatchesSlug(prenom, slug) {
  if (!slug) return false;
  const slugFirst = slug.split("-")[0] ?? "";
  if (!slugFirst) return false;
  const parts = normalizeName(prenom ?? "").split(" ").filter(Boolean);
  return parts.some(
    (p) =>
      p === slugFirst ||
      p.startsWith(slugFirst) ||
      slugFirst.startsWith(p.slice(0, Math.min(3, p.length)))
  );
}

function prenomMatchesInitial(prenom, initial) {
  if (!initial) return false;
  const parts = normalizeName(prenom ?? "").split(" ").filter(Boolean);
  return parts.some((p) => p.startsWith(initial) || initial.startsWith(p.charAt(0)));
}

function familyTokensFromDisplay(display) {
  const parts = display
    .replace(/\./g, " ")
    .trim()
    .split(/\s+/)
    .filter((p) => p.length >= 2);
  if (parts.length <= 1) return parts.map((p) => normalizeName(p)).filter(Boolean);
  return parts.slice(1).map((p) => normalizeName(p));
}

function joueurKeys(j) {
  const p = (j.prenom ?? "").trim();
  const n = (j.nom ?? "").trim();
  const keys = new Set();
  const full = normalizeName(`${p} ${n}`);
  if (full) keys.add(full);
  const nomParts = n.split(/\s+/).filter((t) => t.length >= 2);
  if (p && nomParts[0]) keys.add(normalizeName(`${p} ${nomParts[0]}`));
  return [...keys];
}

function scrapedMatchesJoueur(scrapedName, j) {
  const scrapedNorm = normalizeName(scrapedName);
  if (!scrapedNorm) return false;
  for (const key of joueurKeys(j)) {
    if (key === scrapedNorm || scrapedNorm.includes(key) || key.includes(scrapedNorm)) return true;
  }
  const scrapedFamilies = familyTokensFromDisplay(scrapedName);
  const joueurTokens = normalizeName(`${j.prenom ?? ""} ${j.nom ?? ""}`)
    .split(" ")
    .filter((t) => t.length >= 2);
  const joueurFamilies = joueurTokens.slice(1);
  if (!scrapedFamilies.length || !joueurFamilies.length) return false;
  return scrapedFamilies.some(
    (sf) =>
      sf.length >= 3 &&
      joueurFamilies.some((jf) => jf === sf || jf.startsWith(sf) || sf.startsWith(jf))
  );
}

const ELITE_PRO = "Elite Pro";

function isEligible(j, type) {
  if ((j.categorie_age ?? "").trim() !== ELITE_PRO) return false;
  const sexe = (j.sexe ?? "").toUpperCase();
  if (type === "ATP") return ["M", "H", "HOMME"].includes(sexe);
  return ["F", "FEMME"].includes(sexe);
}

function matchScrapedToCneJoueur(scrapedName, type, joueurs, sourcePlayerId) {
  const slug = atpSlugFromSourceId(sourcePlayerId);
  const candidates = [];
  for (const j of joueurs) {
    if (!isEligible(j, type)) continue;
    if (scrapedMatchesJoueur(scrapedName, j)) candidates.push(j);
  }
  if (!candidates.length) return null;
  if (candidates.length === 1) return candidates[0];
  if (slug) {
    const bySlug = candidates.filter((j) => prenomMatchesSlug(j.prenom, slug));
    if (bySlug.length === 1) return bySlug[0];
  }
  const initial = initialFromAbbreviatedDisplay(scrapedName);
  if (initial) {
    const byInitial = candidates.filter((j) => prenomMatchesInitial(j.prenom, initial));
    if (byInitial.length === 1) return byInitial[0];
  }
  return null;
}

function displayNameForCneJoueur(prenom, nom) {
  return `${prenom ?? ""} ${nom ?? ""}`.replace(/\s+/g, " ").trim();
}

const { data: joueurs } = await admin
  .from("joueurs")
  .select("id, prenom, nom, sexe, categorie_age")
  .or("statut.is.null,statut.eq.actif");

const { data: rows } = await admin
  .from("classements_maroc_scrapes")
  .select("id, nom_joueur, type_classement, source_player_id, semaine_releve");

let fixed = 0;
let newlyMatched = 0;
for (const row of rows ?? []) {
  const hit = matchScrapedToCneJoueur(
    row.nom_joueur,
    row.type_classement,
    joueurs ?? [],
    row.source_player_id
  );
  const nom_joueur = hit
    ? displayNameForCneJoueur(hit.prenom, hit.nom) || row.nom_joueur
    : row.nom_joueur;
  const { error } = await admin
    .from("classements_maroc_scrapes")
    .update({
      joueur_cne_id: hit?.id ?? null,
      est_membre_cne: Boolean(hit),
      nom_joueur,
    })
    .eq("id", row.id);
  if (error) console.error(row.nom_joueur, error.message);
  else {
    fixed++;
    if (hit) {
      newlyMatched++;
      console.log(`→ ${nom_joueur} (${row.type_classement}) semaine ${row.semaine_releve}`);
    }
  }
}

console.log(`Rematch ${fixed} ligne(s), dont ${newlyMatched} liées CNE`);

// Republier dernier relevé
const { data: latest } = await admin
  .from("classements_maroc_scrapes")
  .select("semaine_releve")
  .order("semaine_releve", { ascending: false })
  .limit(1)
  .maybeSingle();

const semaine = latest?.semaine_releve;
if (!semaine) process.exit(0);

const { data: cneRows } = await admin
  .from("classements_maroc_scrapes")
  .select("joueur_cne_id, nom_joueur, type_classement, rang, points, date_releve")
  .eq("semaine_releve", semaine)
  .eq("est_membre_cne", true)
  .not("joueur_cne_id", "is", null);

const SOURCE = "atp-wta-scrape-maroc";
let upserted = 0;
for (const row of cneRows ?? []) {
  const { data: meta } = await admin
    .from("joueurs")
    .select("categorie_age, prenom, nom")
    .eq("id", row.joueur_cne_id)
    .maybeSingle();
  if ((meta?.categorie_age ?? "").trim() !== ELITE_PRO) continue;

  const { error } = await admin.from("classements_externes").upsert(
    {
      joueur_id: row.joueur_cne_id,
      nom_joueur: row.nom_joueur,
      categorie: row.type_classement,
      rang: row.rang,
      points: row.points,
      date_maj: row.date_releve,
      source: SOURCE,
    },
    { onConflict: "joueur_id,categorie" }
  );
  if (error) {
    // fallback sans contrainte unique éventuelle
    const { data: existing } = await admin
      .from("classements_externes")
      .select("id")
      .eq("joueur_id", row.joueur_cne_id)
      .eq("categorie", row.type_classement)
      .maybeSingle();
    if (existing?.id) {
      await admin
        .from("classements_externes")
        .update({
          nom_joueur: row.nom_joueur,
          rang: row.rang,
          points: row.points,
          date_maj: row.date_releve,
          source: SOURCE,
        })
        .eq("id", existing.id);
    } else {
      await admin.from("classements_externes").insert({
        joueur_id: row.joueur_cne_id,
        nom_joueur: row.nom_joueur,
        categorie: row.type_classement,
        rang: row.rang,
        points: row.points,
        date_maj: row.date_releve,
        source: SOURCE,
      });
    }
  }
  await admin
    .from("joueurs")
    .update({ classement: `${row.type_classement} #${row.rang}` })
    .eq("id", row.joueur_cne_id);
  upserted++;
  console.log(`Publié ${row.nom_joueur} ${row.type_classement} #${row.rang}`);
}

console.log(`OK — ${upserted} classement(s) publiés (semaine ${semaine})`);
