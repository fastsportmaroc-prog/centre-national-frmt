import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";
import { createSupabaseAdminClient } from "@/lib/supabase/admin.server";

export const dynamic = "force-dynamic";

const SQL_PATH = join(process.cwd(), "lib/db/migrations/programmation_evenements.sql");

export async function GET() {
  const admin = createSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json({
      ok: false,
      error: "SUPABASE_SERVICE_ROLE_KEY requis pour la vérification.",
      sql: readFileSync(SQL_PATH, "utf8"),
    });
  }

  const { error } = await admin.from("programmation_evenements").select("id").limit(1);
  const ok = !error;
  const missing = error && /schema cache|could not find|does not exist/i.test(error.message);

  return NextResponse.json({
    ok,
    missing: missing ?? !ok,
    message: ok
      ? "Table programmation_evenements présente."
      : "Table programmation_evenements absente — exécutez le SQL ci-dessous dans Supabase → SQL Editor.",
    sql: ok ? null : readFileSync(SQL_PATH, "utf8"),
  });
}
