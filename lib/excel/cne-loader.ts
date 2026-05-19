import type { StageProgrammeRowExcel } from "@/lib/types/stages";
import type { OccupationCneRowExcel } from "@/lib/types/occupation-cne";
import calendrierJson from "@/data/cne/calendrier-stages.json";
import occupationJson from "@/data/cne/occupation.json";
import importMeta from "@/data/cne/import-meta.json";

export type CneImportMeta = typeof importMeta;

export function getCneImportMeta(): CneImportMeta {
  return importMeta;
}

export function loadStagesFromJson(): StageProgrammeRowExcel[] {
  return calendrierJson as StageProgrammeRowExcel[];
}

export function loadOccupationFromJson(): OccupationCneRowExcel[] {
  return occupationJson as OccupationCneRowExcel[];
}

export function rowToStageInput(
  row: StageProgrammeRowExcel,
  id_excel: string | null = row.id_excel ?? null
): Omit<import("@/lib/types/stages").StageProgrammeInput, "id_excel"> & {
  id_excel: string | null;
} {
  return {
    id_excel,
    source: row.source ?? "FRMT",
    categorie: row.categorie ?? "Seniors",
    stage_action: row.stage_action ?? "Stage",
    date_debut: row.date_debut ?? new Date().toISOString().split("T")[0]!,
    date_fin: row.date_fin ?? row.date_debut ?? new Date().toISOString().split("T")[0]!,
    nombre_joueurs: Number(row.nombre_joueurs) || 0,
    nombre_encadrants: Number(row.nombre_encadrants) || 0,
    hebergement: Boolean(row.hebergement),
    chambres: Number(row.chambres) || 0,
    lieu: row.lieu ?? null,
    notes: row.notes ?? null,
    budget_prevu: null,
    budget_reel: null,
    statut: "prevu",
    infrastructure_ids: [],
    entraineur_ids: [],
    materiel_assignations: [],
  };
}
