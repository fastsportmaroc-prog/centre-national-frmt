import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const env = Object.fromEntries(
  readFileSync(join(root, ".env.local"), "utf8")
    .split(/\r?\n/)
    .filter((l) => l.trim() && !l.trim().startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")];
    })
);

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
const rapidKey = env.RAPIDAPI_KEY;
const rapidHost = env.RAPIDAPI_HOST || "tennisapi1.p.rapidapi.com";

if (!url || !key) {
  console.error("Missing SUPABASE env");
  process.exit(1);
}

const admin = createClient(url, key, { auth: { persistSession: false } });

async function rapidGet(path) {
  const res = await fetch(`https://${rapidHost}${path}`, {
    headers: { "x-rapidapi-key": rapidKey, "x-rapidapi-host": rapidHost },
  });
  return { status: res.status, json: res.ok ? await res.json() : await res.text() };
}

async function main() {
  console.log("RAPIDAPI_KEY:", rapidKey ? `${rapidKey.slice(0, 6)}...` : "MISSING");
  console.log("RAPIDAPI_HOST:", rapidHost);

  const { count: ceCount, error: ceErr } = await admin
    .from("classements_externes")
    .select("*", { count: "exact", head: true });
  console.log("classements_externes count:", ceCount, ceErr?.message ?? "");

  const { data: joueurs, error: jErr } = await admin
    .from("joueurs")
    .select("id, nom, prenom, sexe, external_atp_id, external_wta_id, statut")
    .or("statut.is.null,statut.eq.actif")
    .limit(20);
  console.log("joueurs sample:", joueurs?.length, jErr?.message ?? "");
  const withSexe = (joueurs ?? []).filter((j) => j.sexe === "M" || j.sexe === "F" || j.sexe === "H");
  console.log("with sexe M/F/H:", withSexe.length);
  console.log(JSON.stringify(joueurs?.slice(0, 5), null, 2));

  const atp = await rapidGet("/api/tennis/rankings/atp");
  console.log("ATP status:", atp.status);
  if (atp.status === 200 && atp.json?.rankings) {
    console.log("ATP rankings count:", atp.json.rankings.length);
    console.log("First row:", JSON.stringify(atp.json.rankings[0], null, 2));
  } else {
    console.log("ATP body:", typeof atp.json === "string" ? atp.json.slice(0, 200) : atp.json);
  }

  // Test upsert with first eligible player if any
  const testPlayer = withSexe[0];
  if (testPlayer && atp.status === 200) {
    const rankings = atp.json.rankings ?? [];
    const row = rankings.find((r) =>
      String(r.rowName ?? "")
        .toLowerCase()
        .includes(String(testPlayer.nom ?? "").toLowerCase().slice(0, 4))
    );
    if (row) {
      const { error: upErr } = await admin.from("classements_externes").upsert(
        {
          joueur_id: testPlayer.id,
          nom_joueur: `${testPlayer.prenom} ${testPlayer.nom}`.trim(),
          categorie: testPlayer.sexe === "F" ? "WTA" : "ATP",
          rang: row.ranking,
          points: row.points ?? null,
          date_maj: new Date().toISOString(),
          source: "diag-script",
        },
        { onConflict: "joueur_id,categorie" }
      );
      console.log("Test upsert:", upErr?.message ?? "OK");
    } else {
      console.log("No ranking match for test player", testPlayer.nom);
    }
  }

  const { count: afterCount } = await admin
    .from("classements_externes")
    .select("*", { count: "exact", head: true });
  console.log("classements_externes after test:", afterCount);
}

main().catch(console.error);
