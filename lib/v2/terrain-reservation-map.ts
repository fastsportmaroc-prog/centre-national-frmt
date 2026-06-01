import type { ReservationEnrichedV2 } from "@/lib/types/v2";
import { parseTerrainsBesoinsFromNotes, type TerrainBesoin } from "@/lib/data/terrains";
import { dateOnlyString } from "@/lib/v2/calendar-dates";
import {
  creneauHorairesFixed,
  resolveCreneauType,
  type CreneauType,
} from "@/lib/v2/reservations-utils";
import { eachDayOfStage } from "@/lib/v2/stage-calculations";

export type TerrainCreneauV2 = "matin" | "apres_midi" | "journee";

export function creneauTerrainToIso(
  day: string,
  creneauRaw: string
): { debut: string; fin: string; creneau: TerrainCreneauV2; heure_debut: string; heure_fin: string } {
  const d = dateOnlyString(day);
  const c = (creneauRaw ?? "").toLowerCase().replace(/-/g, "_");
  if (c === "journee" || c.includes("journee") || c.includes("journée")) {
    return {
      debut: `${d}T09:00:00`,
      fin: `${d}T18:00:00`,
      creneau: "journee",
      heure_debut: "09:00",
      heure_fin: "18:00",
    };
  }
  if (c.includes("apres")) {
    return {
      debut: `${d}T14:00:00`,
      fin: `${d}T18:00:00`,
      creneau: "apres_midi",
      heure_debut: "14:00",
      heure_fin: "18:00",
    };
  }
  if (c === "matin" || (c.includes("matin") && !c.includes("journee"))) {
    return {
      debut: `${d}T09:00:00`,
      fin: `${d}T13:00:00`,
      creneau: "matin",
      heure_debut: "09:00",
      heure_fin: "13:00",
    };
  }
  return {
    debut: `${d}T09:00:00`,
    fin: `${d}T18:00:00`,
    creneau: "journee",
    heure_debut: "09:00",
    heure_fin: "18:00",
  };
}

export function reservationMergeKey(
  r: Pick<ReservationEnrichedV2, "stage_id" | "infrastructure_id" | "date_debut" | "date_fin" | "creneau">
): string {
  const day = dateOnlyString(r.date_debut);
  const creneau = resolveCreneauType(r);
  return `${r.stage_id ?? ""}|${r.infrastructure_id}|${day}|${creneau}`;
}

export function mapCalendrierTerrainRow(row: Record<string, unknown>): ReservationEnrichedV2 | null {
  const stageId = row.stage_id as string | undefined;
  if (!stageId) return null;
  const day = dateOnlyString(String(row.date_debut ?? ""));
  if (!day) return null;
  const { debut, fin, creneau, heure_debut, heure_fin } = creneauTerrainToIso(
    day,
    String(row.creneau ?? "journee")
  );
  const reservationId = String(row.reservation_id ?? `${stageId}-${row.terrain_id}-${day}-${creneau}`);
  return {
    id: reservationId,
    infrastructure_id: String(row.terrain_id ?? ""),
    stage_id: stageId,
    date_debut: debut,
    date_fin: fin,
    creneau,
    heure_debut,
    heure_fin,
    statut: String(row.resa_statut ?? "confirmee"),
    notes: null,
    stage_nom: (row.stage_nom as string) ?? null,
    stage_categorie: (row.stage_categorie as string) ?? null,
    court_nom: (row.terrain_nom as string) ?? null,
    court_surface: (row.terrain_surface as string) ?? null,
    groupe: (row.stage_categorie as string) ?? null,
  };
}

export function mergeReservationSources(
  infraRows: ReservationEnrichedV2[],
  terrainRows: ReservationEnrichedV2[]
): ReservationEnrichedV2[] {
  const byKey = new Map<string, ReservationEnrichedV2>();
  // terrain_reservations = source prioritaire (rubrique Stages)
  for (const r of terrainRows) {
    byKey.set(reservationMergeKey(r), r);
  }
  for (const r of infraRows) {
    const key = reservationMergeKey(r);
    if (!byKey.has(key)) {
      byKey.set(key, r);
    }
  }
  return [...byKey.values()].sort((a, b) => a.date_debut.localeCompare(b.date_debut));
}

function besoinPrimaryCreneau(besoin: TerrainBesoin): CreneauType {
  const creneaux = besoin.creneaux?.length ? besoin.creneaux : (["journee"] as const);
  if (creneaux.some((c) => c === "journee")) return "journee";
  if (creneaux.some((c) => c === "apres-midi")) return "apres_midi";
  return "matin";
}

function reservationMatchesBesoin(
  r: ReservationEnrichedV2,
  besoin: TerrainBesoin,
  day: string
): boolean {
  if (besoin.jours?.length && !besoin.jours.some((j) => j.slice(0, 10) === day)) return false;
  if (r.infrastructure_id === besoin.terrainId) return true;
  if (besoin.terrainNom && r.court_nom && r.court_nom === besoin.terrainNom) return true;
  return false;
}

function applyCreneauToRow(r: ReservationEnrichedV2, creneau: CreneauType): ReservationEnrichedV2 {
  const day = dateOnlyString(r.date_debut);
  const { debut, fin } = creneauHorairesFixed(creneau);
  const creneauStored = creneau === "apres_midi" ? "apres_midi" : creneau;
  return {
    ...r,
    creneau: creneauStored,
    heure_debut: debut,
    heure_fin: fin,
    date_debut: `${day}T${debut}:00`,
    date_fin: `${day}T${fin}:00`,
  };
}

/** Aligne créneaux affichés sur `[TERRAINS_BESOINS:…]` et complète les lignes manquantes. */
export function finalizeReservationsFromStageBesoins(
  rows: ReservationEnrichedV2[],
  stages: Array<{
    id: string;
    stage_action?: string | null;
    categorie?: string | null;
    date_debut: string;
    date_fin: string;
    notes?: string | null;
  }>
): ReservationEnrichedV2[] {
  const besoinsByStage = new Map<string, TerrainBesoin[]>();
  for (const s of stages) {
    const besoins = parseTerrainsBesoinsFromNotes(s.notes);
    if (besoins?.length) besoinsByStage.set(s.id, besoins);
  }
  if (besoinsByStage.size === 0) return rows;

  const byKey = new Map<string, ReservationEnrichedV2>();
  for (const r of rows) {
    byKey.set(reservationMergeKey(r), r);
  }

  const adjusted: ReservationEnrichedV2[] = [];

  for (const r of rows) {
    if (!r.stage_id) {
      adjusted.push(r);
      continue;
    }
    const besoins = besoinsByStage.get(r.stage_id);
    if (!besoins?.length) {
      adjusted.push(r);
      continue;
    }
    const day = dateOnlyString(r.date_debut);
    const besoin = besoins.find((b) => reservationMatchesBesoin(r, b, day));
    if (!besoin) {
      adjusted.push(r);
      continue;
    }
    const target = besoinPrimaryCreneau(besoin);
    const current = resolveCreneauType(r);
    if (target === "journee" && current !== "journee") {
      adjusted.push(applyCreneauToRow(r, "journee"));
      continue;
    }
    adjusted.push(current === target ? r : applyCreneauToRow(r, target));
  }

  for (const stage of stages) {
    const besoins = besoinsByStage.get(stage.id);
    if (!besoins?.length) continue;
    for (const besoin of besoins) {
      const target = besoinPrimaryCreneau(besoin);
      const creneauxRaw = besoin.creneaux?.length ? besoin.creneaux : (["journee"] as const);
      const days =
        besoin.jours?.length ?
          [...new Set(besoin.jours.map((d) => d.slice(0, 10)))]
        : eachDayOfStage(stage.date_debut, stage.date_fin);

      for (const day of days) {
        for (const creneauRaw of creneauxRaw) {
          const mapped = creneauTerrainToIso(day, creneauRaw === "apres-midi" ? "apres_midi" : creneauRaw);
          const candidate: ReservationEnrichedV2 = {
            id: `besoin-${stage.id}-${besoin.terrainId}-${day}-${mapped.creneau}`,
            infrastructure_id: besoin.terrainId,
            stage_id: stage.id,
            date_debut: mapped.debut,
            date_fin: mapped.fin,
            creneau: mapped.creneau,
            heure_debut: mapped.heure_debut,
            heure_fin: mapped.heure_fin,
            statut: "confirmee",
            notes: null,
            stage_nom: stage.stage_action ?? null,
            stage_categorie: stage.categorie ?? null,
            court_nom: besoin.terrainNom ?? null,
            court_surface: besoin.terrainSurface ?? null,
            groupe: stage.categorie ?? null,
          };
          const key = reservationMergeKey(candidate);
          if (byKey.has(key)) continue;
          if (target === "journee" && mapped.creneau !== "journee") continue;
          byKey.set(key, candidate);
          adjusted.push(candidate);
        }
      }
    }
  }

  return adjusted.sort((a, b) => a.date_debut.localeCompare(b.date_debut));
}

/** Stages avec terrains actifs → affichage journée par défaut (sauf besoin matin explicite). */
export function applyJourneeDefaultForStageTerrains(
  rows: ReservationEnrichedV2[],
  stages: Array<{ id: string; terrains?: boolean; notes?: string | null }>
): ReservationEnrichedV2[] {
  const stageMap = new Map(stages.map((s) => [s.id, s]));
  return rows.map((r) => {
    if (!r.stage_id) return r;
    const stage = stageMap.get(r.stage_id);
    if (!stage?.terrains && !parseTerrainsBesoinsFromNotes(stage?.notes)?.length) return r;

    const besoins = parseTerrainsBesoinsFromNotes(stage?.notes);
    if (besoins?.length) {
      const day = dateOnlyString(r.date_debut);
      const besoin = besoins.find((b) => reservationMatchesBesoin(r, b, day));
      if (besoin?.creneaux?.length && !besoin.creneaux.includes("journee")) {
        return r;
      }
    }

    if (resolveCreneauType(r) === "matin") {
      return applyCreneauToRow(r, "journee");
    }
    return r;
  });
}

function isCourtInfrastructure(
  infra: { type?: string | null } | undefined,
  r: ReservationEnrichedV2
): boolean {
  const t = (infra?.type ?? r.infrastructure_type ?? "").toLowerCase();
  if (t.includes("terrain") || t.includes("court") || t.includes("tennis")) return true;
  const nom = (r.court_nom ?? "").toLowerCase();
  return nom.includes("court") || nom.includes("terrain");
}

/**
 * Réservations liées à un stage sur un court → journée complète par défaut.
 * Supprime les doublons matin quand une journée existe le même jour.
 */
export function normalizeStageLinkedCourtReservations(
  rows: ReservationEnrichedV2[],
  infrastructures: Array<{ id: string; type?: string | null }>,
  stages: Array<{ id: string; terrains?: boolean; notes?: string | null }> = []
): ReservationEnrichedV2[] {
  const infraMap = new Map(infrastructures.map((i) => [i.id, i]));
  const stageMap = new Map(stages.map((s) => [s.id, s]));

  const byDayKey = new Map<string, ReservationEnrichedV2[]>();
  for (const r of rows) {
    if (!r.stage_id) continue;
    const key = `${r.stage_id}|${r.infrastructure_id}|${dateOnlyString(r.date_debut)}`;
    const list = byDayKey.get(key) ?? [];
    list.push(r);
    byDayKey.set(key, list);
  }

  const hideIds = new Set<string>();
  for (const [, group] of byDayKey) {
    const hasJournee = group.some((r) => resolveCreneauType(r) === "journee");
    if (hasJournee) {
      for (const r of group) {
        if (resolveCreneauType(r) === "matin") hideIds.add(r.id);
      }
    }
  }

  let out = rows.filter((r) => !hideIds.has(r.id));

  out = out.map((r) => {
    if (!r.stage_id) return r;
    const infra = infraMap.get(r.infrastructure_id);
    if (!isCourtInfrastructure(infra, r)) return r;

    const stage = stageMap.get(r.stage_id);
    const besoins = parseTerrainsBesoinsFromNotes(stage?.notes);
    if (besoins?.length) {
      const day = dateOnlyString(r.date_debut);
      const besoin = besoins.find((b) => reservationMatchesBesoin(r, b, day));
      if (besoin) {
        const target = besoinPrimaryCreneau(besoin);
        const current = resolveCreneauType(r);
        if (current !== target) return applyCreneauToRow(r, target);
      }
    }
    return r;
  });

  const seen = new Map<string, ReservationEnrichedV2>();
  for (const r of out) {
    const key = reservationMergeKey(r);
    const prev = seen.get(key);
    if (!prev || resolveCreneauType(r) === "journee") {
      seen.set(key, r);
    }
  }
  return [...seen.values()].sort((a, b) => a.date_debut.localeCompare(b.date_debut));
}
