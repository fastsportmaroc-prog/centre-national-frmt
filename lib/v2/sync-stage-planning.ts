import { getReservationsStageTerrains } from "@/lib/data/terrains";
import type { TerrainBesoin } from "@/lib/data/terrains";
import { createSeance, getPlanningByStage, getStages } from "@/lib/supabase/queries";
import { eachDayOfStage } from "@/lib/v2/stage-calculations";

type PlanningSlot = {
  date: string;
  infrastructure_id: string | null;
  heure_debut: string;
  heure_fin: string;
  surface?: string | null;
};

export type StagePlanningSyncInput = {
  stage_id: string;
  date_debut: string;
  date_fin: string;
  notes?: string | null;
  categorie?: string;
  coach_id?: string | null;
};

function normalizeTime(value: string): string {
  return value.slice(0, 5);
}

function creneauHours(creneau: string): { debut: string; fin: string } {
  const c = creneau.toLowerCase();
  if (c.includes("apres")) return { debut: "14:00", fin: "18:00" };
  if (c.includes("matin")) return { debut: "09:00", fin: "13:00" };
  return { debut: "09:00", fin: "18:00" };
}

function slotKey(slot: PlanningSlot): string {
  return `${slot.date}|${slot.infrastructure_id ?? ""}|${normalizeTime(slot.heure_debut)}|${normalizeTime(slot.heure_fin)}`;
}

function parseTerrainsBesoins(notes: string | null | undefined): TerrainBesoin[] | null {
  if (!notes) return null;
  const match = notes.match(/\[TERRAINS_BESOINS:(.+?)\]/);
  if (!match?.[1]) return null;
  try {
    const parsed = JSON.parse(match[1]) as TerrainBesoin[];
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

async function collectPlanningSlots(stage: StagePlanningSyncInput): Promise<PlanningSlot[]> {
  const slots: PlanningSlot[] = [];
  const seen = new Set<string>();

  const push = (slot: PlanningSlot) => {
    const key = slotKey(slot);
    if (seen.has(key)) return;
    seen.add(key);
    slots.push(slot);
  };

  const reservations = await getReservationsStageTerrains(stage.stage_id).catch(() => []);
  for (const row of reservations) {
    const { debut, fin } = creneauHours(String(row.creneau ?? "journee"));
    push({
      date: String(row.date_debut).slice(0, 10),
      infrastructure_id: (row.terrain_id as string | undefined) ?? null,
      heure_debut: debut,
      heure_fin: fin,
      surface: (row.terrain_surface as string | undefined) ?? null,
    });
  }

  if (slots.length === 0) {
    const besoins = parseTerrainsBesoins(stage.notes);
    if (besoins?.length) {
      const days =
        besoins.some((b) => b.jours?.length) ?
          [...new Set(besoins.flatMap((b) => (b.jours ?? []).map((d) => d.slice(0, 10))))]
        : eachDayOfStage(stage.date_debut, stage.date_fin);
      for (const besoin of besoins) {
        const jours =
          besoin.jours?.length ?
            besoin.jours.map((d) => d.slice(0, 10))
          : days;
        for (const jour of jours) {
          for (const creneau of besoin.creneaux) {
            const { debut, fin } = creneauHours(creneau);
            push({
              date: jour,
              infrastructure_id: besoin.terrainId,
              heure_debut: debut,
              heure_fin: fin,
              surface: besoin.terrainSurface ?? null,
            });
          }
        }
      }
    }
  }

  if (slots.length === 0) {
    for (const day of eachDayOfStage(stage.date_debut, stage.date_fin)) {
      push({
        date: day,
        infrastructure_id: null,
        heure_debut: "09:00",
        heure_fin: "13:00",
      });
    }
  }

  return slots;
}

/** Aligne la table `planning` sur les réservations terrain / métadonnées du stage. */
export async function syncStagePlanning(stage: StagePlanningSyncInput): Promise<number> {
  const existing = await getPlanningByStage(stage.stage_id);
  const existingKeys = new Set(
    existing.map(
      (p) =>
        `${p.date}|${p.infrastructure_id ?? ""}|${normalizeTime(p.heure_debut)}|${normalizeTime(p.heure_fin)}`
    )
  );

  const slots = await collectPlanningSlots(stage);
  let created = 0;

  for (const slot of slots) {
    if (existingKeys.has(slotKey(slot))) continue;
    const { data, error } = await createSeance({
      stage_id: stage.stage_id,
      date: slot.date,
      heure_debut: slot.heure_debut,
      heure_fin: slot.heure_fin,
      infrastructure_id: slot.infrastructure_id,
      surface: slot.surface ?? null,
      coach_id: stage.coach_id ?? null,
      groupe: stage.categorie ?? null,
      statut: "prevu",
    });
    if (!error && data) {
      created++;
      existingKeys.add(slotKey(slot));
    }
  }

  return created;
}

/** Synchronise le planning pour tous les stages (backfill + mise à jour). */
export async function syncAllStagesPlanning(): Promise<{ stages: number; created: number }> {
  const stages = await getStages();
  let created = 0;
  for (const s of stages) {
    if (s.statut === "annule") continue;
    created += await syncStagePlanning({
      stage_id: s.id,
      date_debut: s.date_debut,
      date_fin: s.date_fin,
      notes: s.notes,
      categorie: s.categorie,
      coach_id: null,
    });
  }
  return { stages: stages.length, created };
}
