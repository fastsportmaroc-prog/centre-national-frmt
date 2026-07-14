#!/usr/bin/env node
/**
 * Audit historique ATP/WTA — classements_maroc_scrapes (par semaine)
 * + aperçu classements_externes (état courant CNE, pas d'historique hebdo)
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

const env = loadEnv(envPath);
const admin = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

console.log("=== AUDIT HISTORIQUE ATP/WTA ===\n");

const { count: total, error: e1 } = await admin
  .from("classements_maroc_scrapes")
  .select("id", { count: "exact", head: true });

if (e1) {
  console.error("Table classements_maroc_scrapes:", e1.message);
  process.exit(1);
}

console.log(`1) classements_maroc_scrapes — total lignes: ${total ?? 0}`);

const { data: allWeeks } = await admin
  .from("classements_maroc_scrapes")
  .select("semaine_releve, type_classement, date_releve")
  .order("semaine_releve", { ascending: true });

const byWeek = new Map();
for (const r of allWeeks ?? []) {
  const w = r.semaine_releve;
  if (!byWeek.has(w)) {
    byWeek.set(w, { ATP: 0, WTA: 0, date_releve: r.date_releve });
  }
  const cell = byWeek.get(w);
  if (r.type_classement === "ATP") cell.ATP++;
  if (r.type_classement === "WTA") cell.WTA++;
}

const semaines = [...byWeek.keys()].sort();
console.log(`   Semaines distinctes: ${semaines.length}`);
for (const w of semaines) {
  const c = byWeek.get(w);
  console.log(
    `   - semaine ${w} | ATP ${c.ATP} | WTA ${c.WTA} | scrape ${c.date_releve}`
  );
}

if (semaines.length < 2) {
  console.log(
    "\n⚠ Une seule semaine en base → l'évolution Δ semaine / courbes multi-semaines ne peut pas encore se calculer (il faut au moins 2 relevés hebdo)."
  );
} else {
  console.log(
    "\n✓ Plusieurs semaines présentes → historique suffisant pour l'évolution."
  );
}

// Échantillon CNE — séries par joueur
const { data: cneSample } = await admin
  .from("classements_maroc_scrapes")
  .select(
    "nom_joueur, type_classement, source_player_id, joueur_cne_id, est_membre_cne, semaine_releve, rang, points, evolution"
  )
  .eq("est_membre_cne", true)
  .order("semaine_releve", { ascending: true });

const series = new Map();
for (const r of cneSample ?? []) {
  const key = `${r.type_classement}:${r.source_player_id ?? r.nom_joueur}`;
  if (!series.has(key)) {
    series.set(key, {
      nom: r.nom_joueur,
      type: r.type_classement,
      points: [],
    });
  }
  series.get(key).points.push({
    semaine: r.semaine_releve,
    rang: r.rang,
    points: r.points,
    evolution: r.evolution,
  });
}

console.log(`\n2) Membres CNE dans les scrapes: ${series.size} joueur(s)`);
for (const [, s] of [...series.entries()].slice(0, 8)) {
  const pts = s.points;
  const last = pts[pts.length - 1];
  const first = pts[0];
  const delta =
    pts.length >= 2 ? first.rang - last.rang : null; // + = progression
  console.log(
    `   - ${s.nom} (${s.type}) | ${pts.length} relevé(s) | premier #${first.rang} → dernier #${last.rang}` +
      (delta != null ? ` | Δ rang vs 1er: ${delta > 0 ? "+" : ""}${delta}` : "")
  );
  for (const p of pts) {
    console.log(
      `       ${p.semaine}: #${p.rang} (${p.points ?? "—"} pts, évol.off=${p.evolution ?? "—"})`
    );
  }
}

// classements_externes = snapshot courant uniquement
const { count: extCount } = await admin
  .from("classements_externes")
  .select("id", { count: "exact", head: true });

const { data: extRows } = await admin
  .from("classements_externes")
  .select("nom_joueur, categorie, rang, points, date_maj, source")
  .in("categorie", ["ATP", "WTA"])
  .order("rang", { ascending: true })
  .limit(15);

console.log(`\n3) classements_externes (CNE RapidAPI/scrape publish) — lignes: ${extCount ?? 0}`);
console.log(
  "   ⚠ Cette table = 1 ligne / joueur+catégorie (upsert), PAS un historique par semaine."
);
console.log("   L'évolution hebdo pour le Classement International vient de classements_maroc_scrapes.");
for (const r of extRows ?? []) {
  console.log(
    `   - ${r.nom_joueur} ${r.categorie} #${r.rang} | maj ${r.date_maj} | ${r.source}`
  );
}

console.log("\n=== VERDICT ===");
if ((total ?? 0) === 0) {
  console.log("FAIL: aucun scrape marocain en base.");
} else if (semaines.length === 1) {
  console.log(
    "OK partiel: données enregistrées avec semaine_releve + date_releve, mais 1 seule semaine → relancer le scrape la semaine prochaine (ou --force une autre semaine) pour l'évolution."
  );
} else {
  console.log(
    "OK: historique multi-semaines présent dans classements_maroc_scrapes — prêt pour évolution."
  );
}
