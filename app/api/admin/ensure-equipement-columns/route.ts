import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { join } from "path";

export const dynamic = "force-dynamic";

const SQL_PATH = join(process.cwd(), "lib/db/migrations/equipement_tailles_complet.sql");

async function probeColumn(
  url: string,
  key: string,
  table: "joueurs" | "entraineurs",
  column: string
): Promise<boolean> {
  const client = createClient(url, key);
  const { error } = await client.from(table).select(column).limit(1);
  return !error;
}

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceKey?.startsWith("eyJ")) {
    return NextResponse.json({
      ok: false,
      error: "SUPABASE_SERVICE_ROLE_KEY requis pour la vérification.",
      sql: readFileSync(SQL_PATH, "utf8"),
    });
  }

  const joueurOk = await probeColumn(url, serviceKey, "joueurs", "taille_chaussures");
  const coachOk = await probeColumn(url, serviceKey, "entraineurs", "taille_chaussures");

  return NextResponse.json({
    ok: joueurOk && coachOk,
    joueurs: joueurOk,
    entraineurs: coachOk,
    sql: joueurOk && coachOk ? null : readFileSync(SQL_PATH, "utf8"),
  });
}
