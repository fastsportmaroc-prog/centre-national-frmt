import { NextResponse } from "next/server";
import { getAuthUserFromServer } from "@/lib/auth/server-session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin.server";
import { getSupabaseServerDataClient } from "@/lib/supabase/data-client.server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { JoueurV2 } from "@/lib/types/v2";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export type DashboardRankingRow = {
  joueur_id: string;
  nom: string;
  prenom: string;
  photo_url: string | null;
  categorie: string | null;
  sexe: string | null;
  classement_simple: string | null;
  classement_double: string | null;
  /** Variation du rang : négatif = progression (rang qui baisse). */
  variation: number | null;
  circuit: string | null;
};

function variationFromEvolution(evolution: number | null | undefined): number | null {
  if (evolution == null) return null;
  return -evolution;
}

export async function GET() {
  const user = await getAuthUserFromServer();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ rows: [] });
  }

  const supabase = await getSupabaseServerDataClient();
  const { data, error } = await supabase.from("joueurs").select("*").order("nom");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const joueurs = (data ?? []) as JoueurV2[];

  const admin = createSupabaseAdminClient();
  const classementsByJoueur = new Map<
    string,
    Array<{
      categorie: string;
      rang: number;
      evolution: number | null;
    }>
  >();

  if (admin) {
    const ids = joueurs.map((j) => j.id);
    if (ids.length) {
      let classements:
        | Array<{ joueur_id: string; categorie: string; rang: number; evolution?: number | null }>
        | null = null;

      const withEvo = await admin
        .from("classements_externes")
        .select("joueur_id, categorie, rang, evolution")
        .in("joueur_id", ids);

      if (!withEvo.error) {
        classements = withEvo.data;
      } else {
        const basic = await admin
          .from("classements_externes")
          .select("joueur_id, categorie, rang")
          .in("joueur_id", ids);
        classements = basic.data;
      }

      for (const row of classements ?? []) {
        const list = classementsByJoueur.get(row.joueur_id as string) ?? [];
        list.push({
          categorie: row.categorie as string,
          rang: row.rang as number,
          evolution: (row.evolution as number | null) ?? null,
        });
        classementsByJoueur.set(row.joueur_id as string, list);
      }
    }
  }

  const rows: DashboardRankingRow[] = [];

  for (const j of joueurs) {
    const hits = classementsByJoueur.get(j.id) ?? [];
    if (!hits.length) {
      const simple = (j.classement ?? "").trim();
      const itf = (j.classement_itf ?? "").trim();
      if (!simple && !itf) continue;
      rows.push({
        joueur_id: j.id,
        nom: j.nom,
        prenom: j.prenom,
        photo_url: j.photo_url ?? null,
        categorie: j.categorie_age ?? j.categorie ?? null,
        sexe: j.sexe ?? null,
        classement_simple: simple || null,
        classement_double: itf || null,
        variation: null,
        circuit: simple ? "ATP/WTA" : itf ? "ITF Junior" : null,
      });
      continue;
    }

    const atpWta = hits.find((h) => h.categorie === "ATP" || h.categorie === "WTA");
    const itf = hits.find((h) => h.categorie === "ITF Junior");
    const primary = atpWta ?? itf ?? hits[0]!;

    rows.push({
      joueur_id: j.id,
      nom: j.nom,
      prenom: j.prenom,
      photo_url: j.photo_url ?? null,
      categorie: j.categorie_age ?? j.categorie ?? null,
      sexe: j.sexe ?? null,
      classement_simple: atpWta
        ? `${atpWta.categorie} #${atpWta.rang}`
        : itf
          ? `ITF J #${itf.rang}`
          : `${primary.categorie} #${primary.rang}`,
      classement_double: itf && atpWta ? `ITF J #${itf.rang}` : itf ? `ITF J #${itf.rang}` : null,
      variation: variationFromEvolution(primary.evolution),
      circuit: primary.categorie,
    });
  }

  return NextResponse.json({ rows });
}
