import {
  getReservationsStageTerrains,
  parseTerrainsBesoinsFromNotes,
} from "@/lib/data/terrains";
import { createSeance, deleteSeance, getPlanningByStage, getStages } from "@/lib/supabase/queries";
import { eachDayOfStage } from "@/lib/v2/stage-calculations";

export const PLANNING_AUTO_TERRAIN_NOTE = "[AUTO_TERRAIN]";

type PlanningSlot = {
  date: string;
  infrastructure_id: string | null;
  heure_debut: string;
  heure_fin: string;
  surface?: string | null;
};

type TemplateSlot = { heure_debut: string; heure_fin: string };

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

function parsePlanningTemplateCode(notes: string | null | undefined): string | null {
  if (!notes) return null;
  const match = notes.match(/\[PLANNING_TEMPLATE:([a-z0-9_-]+)\]/i);
  return match?.[1]?.toLowerCase() ?? null;
}

function parsePlanningSlots(notes: string | null | undefined): TemplateSlot[] | null {
  if (!notes) return null;
  const match = notes.match(/\[PLANNING_SLOTS:(.+?)\]/);
  if (!match?.[1]) return null;
  try {
    const parsed = JSON.parse(match[1]) as Array<{ heure_debut?: string; heure_fin?: string }>;
    const normalized = parsed
      .map((slot) => ({
        heure_debut: String(slot.heure_debut ?? "").slice(0, 5),
        heure_fin: String(slot.heure_fin ?? "").slice(0, 5),
      }))
      .filter((slot) => /^\d{2}:\d{2}$/.test(slot.heure_debut) && /^\d{2}:\d{2}$/.test(slot.heure_fin));
    return normalized.length > 0 ? normalized : null;
  } catch {
    return null;
  }
}

function templateSlotsFromCode(code: string | null): TemplateSlot[] {
  if (code === "double_daily_stage") {
    return [
      { heure_debut: "09:00", heure_fin: "13:00" },
      { heure_debut: "14:00", heure_fin: "18:00" },
    ];
  }
  return [{ heure_debut: "09:00", heure_fin: "13:00" }];
}

/** Créneaux planning issus des réservations terrain (source pour remplacement idempotent). */
export async function collectTerrainPlanningSlots(
  stage: Pick<StagePlanningSyncInput, "stage_id" | "date_debut" | "date_fin" | "notes">
): Promise<PlanningSlot[]> {
  const slots: PlanningSlot[] = [];
  const seen = new Set<string>();

  const reservations = await getReservationsStageTerrains(stage.stage_id).catch(() => []);
  for (const row of reservations) {
    const { debut, fin } = creneauHours(String(row.creneau ?? "journee"));
    const slot: PlanningSlot = {
      date: String(row.date_debut).slice(0, 10),
      infrastructure_id: (row.terrain_id as string | undefined) ?? null,
      heure_debut: debut,
      heure_fin: fin,
      surface: (row.terrain_surface as string | undefined) ?? null,
    };
    const key = slotKey(slot);
    if (seen.has(key)) continue;
    seen.add(key);
    slots.push(slot);
  }

  if (slots.length === 0) {
    const besoins = parseTerrainsBesoinsFromNotes(stage.notes);
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
          for (const creneau of besoin.creneaux?.length ? besoin.creneaux : (["journee"] as const)) {
            const { debut, fin } = creneauHours(creneau);
            const slot: PlanningSlot = {
              date: jour,
              infrastructure_id: besoin.terrainId,
              heure_debut: debut,
              heure_fin: fin,
              surface: besoin.terrainSurface ?? null,
            };
            const key = slotKey(slot);
            if (seen.has(key)) continue;
            seen.add(key);
            slots.push(slot);
          }
        }
      }
    }
  }

  return slots;
}

async function collectTemplatePlanningSlots(stage: StagePlanningSyncInput): Promise<PlanningSlot[]> {
  const slots: PlanningSlot[] = [];
  const seen = new Set<string>();
  const customSlots = parsePlanningSlots(stage.notes);
  const templateSlots = customSlots ?? templateSlotsFromCode(parsePlanningTemplateCode(stage.notes));
  for (const day of eachDayOfStage(stage.date_debut, stage.date_fin)) {
    for (const slot of templateSlots) {
      const row: PlanningSlot = {
        date: day,
        infrastructure_id: null,
        heure_debut: slot.heure_debut,
        heure_fin: slot.heure_fin,
      };
      const key = slotKey(row);
      if (seen.has(key)) continue;
      seen.add(key);
      slots.push(row);
    }
  }
  return slots;
}

async function removeTerrainPlanningSlots(stageId: string, terrainSlotKeys: Set<string>): Promise<number> {
  const existing = await getPlanningByStage(stageId);
  let removed = 0;
  for (const row of existing) {
    const key = `${row.date}|${row.infrastructure_id ?? ""}|${normalizeTime(row.heure_debut)}|${normalizeTime(row.heure_fin)}`;
    if (!terrainSlotKeys.has(key)) continue;
    const res = await deleteSeance(row.id);
    if (res.ok) removed++;
  }
  return removed;
}

async function insertPlanningSlots(
  stage: StagePlanningSyncInput,
  slots: PlanningSlot[],
  existingKeys: Set<string>
): Promise<number> {
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

/** Remplace les séances planning liées aux réservations terrain (évite les doublons). */
export async function syncStagePlanningWithTerrainReservations(
  stage: StagePlanningSyncInput
): Promise<number> {
  const terrainSlots = await collectTerrainPlanningSlots(stage);
  if (terrainSlots.length === 0) return 0;

  const terrainKeys = new Set(terrainSlots.map(slotKey));
  await removeTerrainPlanningSlots(stage.stage_id, terrainKeys);

  const existing = await getPlanningByStage(stage.stage_id);
  const existingKeys = new Set(
    existing.map(
      (p) =>
        `${p.date}|${p.infrastructure_id ?? ""}|${normalizeTime(p.heure_debut)}|${normalizeTime(p.heure_fin)}`
    )
  );

  return insertPlanningSlots(stage, terrainSlots, existingKeys);
}

/** Aligne la table `planning` sur les réservations terrain / métadonnées du stage. */
export async function syncStagePlanning(stage: StagePlanningSyncInput): Promise<number> {
  const terrainSlots = await collectTerrainPlanningSlots(stage);
  if (terrainSlots.length > 0) {
    return syncStagePlanningWithTerrainReservations(stage);
  }

  const existing = await getPlanningByStage(stage.stage_id);
  const existingKeys = new Set(
    existing.map(
      (p) =>
        `${p.date}|${p.infrastructure_id ?? ""}|${normalizeTime(p.heure_debut)}|${normalizeTime(p.heure_fin)}`
    )
  );
  const templateSlots = await collectTemplatePlanningSlots(stage);
  return insertPlanningSlots(stage, templateSlots, existingKeys);
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
