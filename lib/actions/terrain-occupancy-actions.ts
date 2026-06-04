"use server";

import { getSupabaseServerDataClient } from "@/lib/supabase/data-client.server";
import {
  buildInfrastructureAliasIndex,
  toCanonicalInfrastructureId,
} from "@/lib/terrain/court-infrastructure";
import { resolveCreneauType } from "@/lib/v2/reservations-utils";
import type { CreneauType } from "@/lib/v2/reservations-utils";

export type TerrainOccupancySlot = {
  date: string;
  infrastructure_id: string;
  infrastructure_nom: string;
  creneau: CreneauType;
  stage_id: string | null;
  stage_nom: string;
  reservation_id: string;
};

function isCancelled(statut: string | null | undefined): boolean {
  return (statut ?? "").toLowerCase().includes("annul");
}

/** Occupation des courts (tous stages) sur une période — pour l’onglet Terrains du stage. */
export async function getTerrainOccupancyAction(options: {
  dateDebut: string;
  dateFin: string;
  excludeStageId?: string;
}): Promise<TerrainOccupancySlot[]> {
  const supabase = await getSupabaseServerDataClient();
  const debut = options.dateDebut.slice(0, 10);
  const fin = options.dateFin.slice(0, 10);

  const { data: rows, error } = await supabase
    .from("reservations_infrastructure")
    .select(
      "id, infrastructure_id, stage_id, date_debut, date_fin, creneau, heure_debut, heure_fin, statut"
    )
    .gte("date_debut", `${debut}T00:00:00`)
    .lte("date_debut", `${fin}T23:59:59`);

  if (error || !rows?.length) return [];

  const infraIds = [...new Set(rows.map((r) => r.infrastructure_id).filter(Boolean))] as string[];
  const stageIds = [...new Set(rows.map((r) => r.stage_id).filter(Boolean))] as string[];

  const [infraRes, stagesRes] = await Promise.all([
    infraIds.length
      ? supabase.from("infrastructures").select("id, nom, actif").in("id", infraIds)
      : Promise.resolve({ data: [] }),
    stageIds.length
      ? supabase.from("stages_programme").select("id, stage_action").in("id", stageIds)
      : Promise.resolve({ data: [] }),
  ]);

  const { data: allInfra } = await supabase.from("infrastructures").select("id, nom, actif");
  const aliasIndex = buildInfrastructureAliasIndex(
    (allInfra ?? []) as { id: string; nom: string; actif?: boolean }[]
  );

  const infraMap = new Map(
    ((infraRes.data ?? []) as { id: string; nom: string }[]).map((i) => [i.id, i.nom])
  );
  for (const [id, nom] of aliasIndex.canonicalNomById) {
    if (!infraMap.has(id)) infraMap.set(id, nom);
  }
  const stageMap = new Map(
    ((stagesRes.data ?? []) as { id: string; stage_action: string }[]).map((s) => [
      s.id,
      s.stage_action,
    ])
  );

  const out: TerrainOccupancySlot[] = [];
  for (const row of rows) {
    if (isCancelled(row.statut)) continue;
    if (options.excludeStageId && row.stage_id === options.excludeStageId) continue;

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
      aliasIndex.canonicalNomById.get(canonicalInfraId) ??
      infraMap.get(row.infrastructure_id) ??
      infraMap.get(canonicalInfraId) ??
      "Court";

    out.push({
      date,
      infrastructure_id: canonicalInfraId,
      infrastructure_nom: infraNom,
      creneau,
      stage_id: row.stage_id ?? null,
      stage_nom: row.stage_id ? stageMap.get(row.stage_id) ?? "Stage" : "—",
      reservation_id: row.id,
    });
  }

  return out.sort((a, b) =>
    a.date.localeCompare(b.date) ||
    a.infrastructure_nom.localeCompare(b.infrastructure_nom) ||
    a.creneau.localeCompare(b.creneau)
  );
}
