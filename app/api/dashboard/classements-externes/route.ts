import { NextResponse } from "next/server";

import { getAuthUserFromServer } from "@/lib/auth/server-session";

import { isSupabaseConfigured } from "@/lib/supabase/config";

import { createSupabaseAdminClient } from "@/lib/supabase/admin.server";

import type { ClassementExterneRow } from "@/lib/types/classements-externes";



export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type SyncMeta = {
  lastSyncAt: string | null;
  linesLastSync: number;
};



async function loadClassementsExternes(): Promise<{
  rows: ClassementExterneRow[];
  syncMeta: SyncMeta;
  error?: string;
}> {
  if (!isSupabaseConfigured()) {
    return { rows: [], syncMeta: { lastSyncAt: null, linesLastSync: 0 } };
  }



  const admin = createSupabaseAdminClient();

  if (!admin) {
    return {
      rows: [],
      syncMeta: { lastSyncAt: null, linesLastSync: 0 },
      error: "SUPABASE_SERVICE_ROLE_KEY manquant",
    };
  }



  let result = await admin
    .from("classements_externes")
    .select(
      "id, joueur_id, nom_joueur, categorie, rang, points, date_maj, source, evolution, rang_precedent"
    )
    .order("rang", { ascending: true });

  if (result.error?.message?.includes("evolution")) {
    result = await admin
      .from("classements_externes")
      .select("id, joueur_id, nom_joueur, categorie, rang, points, date_maj, source")
      .order("rang", { ascending: true });
  }



  if (result.error) {
    return {
      rows: [],
      syncMeta: { lastSyncAt: null, linesLastSync: 0 },
      error: result.error.message,
    };
  }

  const rows = (result.data ?? []).map((row) => ({
    ...(row as ClassementExterneRow),
    evolution: (row as { evolution?: number | null }).evolution ?? null,
    rang_precedent: (row as { rang_precedent?: number | null }).rang_precedent ?? null,
  })) as ClassementExterneRow[];
  const lastSyncAt = rows.length
    ? rows
        .map((r) => r.date_maj)
        .filter(Boolean)
        .sort()
        .at(-1) ?? null
    : null;
  const linesLastSync = lastSyncAt ? rows.filter((r) => r.date_maj === lastSyncAt).length : 0;
  return { rows, syncMeta: { lastSyncAt, linesLastSync } };

}



export async function GET() {

  const user = await getAuthUserFromServer();

  if (!user) {

    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  }



  const { rows, syncMeta, error } = await loadClassementsExternes();

  if (error) {

    return NextResponse.json({ rows: [], syncMeta, error }, { status: 200 });

  }



  return NextResponse.json({ rows, syncMeta });

}


