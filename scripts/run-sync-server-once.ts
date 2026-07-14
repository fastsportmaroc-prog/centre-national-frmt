import { runSyncClassementsServer } from "../lib/classements-externes/sync-classements.server";
import { createSupabaseAdminClient } from "../lib/supabase/admin.server";

async function main() {
  const summary = await runSyncClassementsServer();
  console.log(JSON.stringify(summary, null, 2));

  const admin = createSupabaseAdminClient();
  if (admin) {
    const { data, error } = await admin
      .from("classements_externes")
      .select("id, nom_joueur, categorie, rang, points, date_maj")
      .order("rang", { ascending: true })
      .limit(10);
    console.log("\n--- DB rows (first 10) ---");
    if (error) console.log("DB error:", error.message);
    else console.log(JSON.stringify(data, null, 2));
    console.log("Total count query...");
    const { count } = await admin
      .from("classements_externes")
      .select("*", { count: "exact", head: true });
    console.log("count:", count ?? 0);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
