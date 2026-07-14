import { NextResponse } from "next/server";
import { getAuthUserFromServer } from "@/lib/auth/server-session";
import { getSupabaseServerDataClient } from "@/lib/supabase/data-client.server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  buildInfrastructureAliasIndex,
  toCanonicalInfrastructureId,
} from "@/lib/terrain/court-infrastructure";
import { resolveCreneauType } from "@/lib/v2/reservations-utils";
import type { CreneauType } from "@/lib/v2/reservations-utils";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export type OccupationPerson = { id: string; nom: string; prenom: string; role: "joueur" | "coach" };

export type OccupationSlot = {
  date: string;
  infrastructure_id: string;
  infrastructure_nom: string;
  creneau: CreneauType;
  stage_id: string | null;
  stage_nom: string;
  reservation_id: string;
  persons: OccupationPerson[];
};

function isCancelled(statut: string | null | undefined): boolean {
  return (statut ?? "").toLowerCase().includes("annul");
}

export async function GET(request: Request) {
  const user = await getAuthUserFromServer();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const url = new URL(request.url);
  const debut = (url.searchParams.get("dateDebut") ?? "").slice(0, 10);
  const fin = (url.searchParams.get("dateFin") ?? "").slice(0, 10);
  if (!debut || !fin) {
    return NextResponse.json({ error: "dateDebut et dateFin requis" }, { status: 400 });
  }

  if (!isSupabaseConfigured()) return NextResponse.json({ slots: [], persons: [] });

  const supabase = await getSupabaseServerDataClient();
  const { data: rows, error } = await supabase
    .from("reservations_infrastructure")
    .select("id, infrastructure_id, stage_id, entraineur_id, date_debut, date_fin, creneau, heure_debut, heure_fin, statut")
    .gte("date_debut", `${debut}T00:00:00`)
    .lte("date_debut", `${fin}T23:59:59`);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!rows?.length) return NextResponse.json({ slots: [], persons: [] });

  const stageIds = [...new Set(rows.map((r) => r.stage_id).filter(Boolean))] as string[];
  const coachIdsDirect = [...new Set(rows.map((r) => r.entraineur_id).filter(Boolean))] as string[];

  const [{ data: allInfra }, stageJoueurRes, stageCoachRes] = await Promise.all([
    supabase.from("infrastructures").select("id, nom, actif"),
    stageIds.length
      ? supabase.from("stage_joueurs").select("stage_id, joueur_id").in("stage_id", stageIds)
      : Promise.resolve({ data: [] as { stage_id: string; joueur_id: string }[] }),
    stageIds.length
      ? supabase.from("stage_coachs").select("stage_id, coach_id").in("stage_id", stageIds)
      : Promise.resolve({ data: [] as { stage_id: string; coach_id: string }[] }),
  ]);

  const stageJoueurLinks = (stageJoueurRes.data ?? []) as { stage_id: string; joueur_id: string }[];
  const stageCoachLinks = (stageCoachRes.data ?? []) as { stage_id: string; coach_id: string }[];

  const joueurIds = [...new Set(stageJoueurLinks.map((l) => l.joueur_id))];
  const coachIds = [
    ...new Set([...stageCoachLinks.map((l) => l.coach_id), ...coachIdsDirect]),
  ];

  const [{ data: joueursData }, { data: coachsData }, { data: stagesData }] = await Promise.all([
    joueurIds.length
      ? supabase.from("joueurs").select("id, nom, prenom").in("id", joueurIds)
      : Promise.resolve({ data: [] as { id: string; nom: string; prenom: string }[] }),
    coachIds.length
      ? supabase.from("entraineurs").select("id, nom, prenom").in("id", coachIds)
      : Promise.resolve({ data: [] as { id: string; nom: string; prenom: string }[] }),
    stageIds.length
      ? supabase.from("stages_programme").select("id, stage_action").in("id", stageIds)
      : Promise.resolve({ data: [] as { id: string; stage_action: string }[] }),
  ]);

  const joueurMap = new Map(
    ((joueursData ?? []) as { id: string; nom: string; prenom: string }[]).map((j) => [j.id, j])
  );
  const coachMap = new Map(
    ((coachsData ?? []) as { id: string; nom: string; prenom: string }[]).map((c) => [c.id, c])
  );
  const stageMap = new Map(
    ((stagesData ?? []) as { id: string; stage_action: string }[]).map((s) => [s.id, s.stage_action])
  );

  const joueursByStage = new Map<string, string[]>();
  for (const l of stageJoueurLinks) {
    const arr = joueursByStage.get(l.stage_id) ?? [];
    arr.push(l.joueur_id);
    joueursByStage.set(l.stage_id, arr);
  }
  const coachsByStage = new Map<string, string[]>();
  for (const l of stageCoachLinks) {
    const arr = coachsByStage.get(l.stage_id) ?? [];
    arr.push(l.coach_id);
    coachsByStage.set(l.stage_id, arr);
  }

  const aliasIndex = buildInfrastructureAliasIndex(
    (allInfra ?? []) as { id: string; nom: string; actif?: boolean }[]
  );

  const personsSet = new Map<string, OccupationPerson>();
  const slots: OccupationSlot[] = [];

  for (const row of rows) {
    if (isCancelled(row.statut)) continue;
    const date = String(row.date_debut).slice(0, 10);
    const creneau = resolveCreneauType({
      stage_id: row.stage_id,
      date_debut: row.date_debut,
      date_fin: row.date_fin,
      creneau: row.creneau,
      heure_debut: row.heure_debut,
      heure_fin: row.heure_fin,
    });
    const canonicalInfraId = toCanonicalInfrastructureId(row.infrastructure_id, aliasIndex);
    const infraNom =
      aliasIndex.canonicalNomById.get(canonicalInfraId) ?? "Court";

    const persons: OccupationPerson[] = [];
    if (row.stage_id) {
      for (const jid of joueursByStage.get(row.stage_id) ?? []) {
        const j = joueurMap.get(jid);
        if (j) {
          const p: OccupationPerson = { id: j.id, nom: j.nom, prenom: j.prenom, role: "joueur" };
          persons.push(p);
          personsSet.set(`joueur-${j.id}`, p);
        }
      }
      for (const cid of coachsByStage.get(row.stage_id) ?? []) {
        const c = coachMap.get(cid);
        if (c) {
          const p: OccupationPerson = { id: c.id, nom: c.nom, prenom: c.prenom, role: "coach" };
          persons.push(p);
          personsSet.set(`coach-${c.id}`, p);
        }
      }
    }
    if (row.entraineur_id) {
      const c = coachMap.get(row.entraineur_id);
      if (c && !persons.some((p) => p.role === "coach" && p.id === c.id)) {
        const p: OccupationPerson = { id: c.id, nom: c.nom, prenom: c.prenom, role: "coach" };
        persons.push(p);
        personsSet.set(`coach-${c.id}`, p);
      }
    }

    slots.push({
      date,
      infrastructure_id: canonicalInfraId,
      infrastructure_nom: infraNom,
      creneau,
      stage_id: row.stage_id ?? null,
      stage_nom: row.stage_id ? stageMap.get(row.stage_id) ?? "Stage" : "—",
      reservation_id: row.id,
      persons,
    });
  }

  const persons = [...personsSet.values()].sort(
    (a, b) =>
      a.role.localeCompare(b.role) ||
      `${a.prenom} ${a.nom}`.localeCompare(`${b.prenom} ${b.nom}`, "fr")
  );

  slots.sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      a.infrastructure_nom.localeCompare(b.infrastructure_nom) ||
      a.creneau.localeCompare(b.creneau)
  );

  return NextResponse.json({ slots, persons });
}
