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

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const sql = readFileSync(
  join(root, "supabase/migrations/061_classements_externes_api_cache.sql"),
  "utf8"
);

// Supabase JS has no raw SQL — verify table via select
const { error } = await admin.from("classements_externes_api_cache").select("cache_key").limit(1);
if (error?.message?.includes("does not exist") || error?.code === "42P01") {
  console.log("Table manquante — appliquez la migration 061 via Supabase SQL Editor:");
  console.log(sql);
  process.exit(1);
}
console.log("Table classements_externes_api_cache OK");
