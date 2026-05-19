import type { Court, CourtInput, CourtStatut } from "@/lib/types/database";
import type {
  Infrastructure,
  InfrastructureInput,
  SurfaceInfrastructure,
  StatutInfrastructure,
} from "@/lib/types/infrastructures";

const SURFACE_TO_INFRA: Record<string, SurfaceInfrastructure> = {
  "terre battue": "terre_battue",
  terre_battue: "terre_battue",
  dur: "dur",
  synthétique: "autre",
  synthetique: "autre",
  indoor: "indoor",
  extérieur: "exterieur",
  exterieur: "exterieur",
};

const INFRA_TO_SURFACE_LABEL: Record<SurfaceInfrastructure, string> = {
  terre_battue: "Terre battue",
  dur: "Dur",
  indoor: "Indoor",
  exterieur: "Extérieur",
  autre: "Autre",
};

function parseTerrainFlags(notes: string | null): { couvert: boolean; eclairage: boolean; rest: string | null } {
  if (!notes?.trim()) return { couvert: false, eclairage: false, rest: null };
  let rest = notes;
  const couvert = /\bcouvert\b/i.test(rest);
  const eclairage = /\béclairage\b/i.test(rest) || /\beclairage\b/i.test(rest);
  rest = rest
    .replace(/\bcouvert\b/gi, "")
    .replace(/\béclairage\b/gi, "")
    .replace(/\beclairage\b/gi, "")
    .replace(/\s*·\s*/g, " · ")
    .replace(/^ · | · $/g, "")
    .trim();
  return { couvert, eclairage, rest: rest || null };
}

function buildTerrainNotes(input: CourtInput): string | null {
  const parts: string[] = [];
  if (input.couvert) parts.push("Couvert");
  if (input.eclairage) parts.push("Éclairage");
  if (input.notes?.trim()) parts.push(input.notes.trim());
  return parts.length ? parts.join(" · ") : null;
}

export function isTerrainInfrastructure(i: Infrastructure): boolean {
  return i.type === "terrain";
}

export function infrastructureToCourt(i: Infrastructure): Court {
  const { couvert, eclairage, rest } = parseTerrainFlags(i.notes);
  return {
    id: i.id,
    nom: i.nom,
    surface: INFRA_TO_SURFACE_LABEL[i.surface] ?? "Autre",
    couvert,
    eclairage,
    actif: i.actif,
    statut: i.statut as CourtStatut,
    maintenance_jusquau: null,
    notes: rest,
    created_at: i.created_at,
  };
}

export function courtInputToInfrastructureInput(input: CourtInput): InfrastructureInput {
  const key = input.surface.trim().toLowerCase();
  return {
    nom: input.nom.trim(),
    type: "terrain",
    surface: SURFACE_TO_INFRA[key] ?? "autre",
    capacite: 4,
    actif: input.actif,
    statut: input.statut as StatutInfrastructure,
    notes: buildTerrainNotes(input),
  };
}

export function courtPatchToInfrastructurePatch(
  input: Partial<CourtInput>
): Partial<InfrastructureInput> {
  const patch: Partial<InfrastructureInput> = {};
  if (input.nom !== undefined) patch.nom = input.nom.trim();
  if (input.actif !== undefined) patch.actif = input.actif;
  if (input.statut !== undefined) patch.statut = input.statut as StatutInfrastructure;
  if (input.surface !== undefined) {
    const key = input.surface.trim().toLowerCase();
    patch.surface = SURFACE_TO_INFRA[key] ?? "autre";
  }
  if (
    input.couvert !== undefined ||
    input.eclairage !== undefined ||
    input.notes !== undefined
  ) {
    patch.notes = buildTerrainNotes({
      nom: input.nom ?? "",
      surface: input.surface ?? "Dur",
      couvert: input.couvert ?? false,
      eclairage: input.eclairage ?? false,
      actif: input.actif ?? true,
      statut: input.statut ?? "disponible",
      maintenance_jusquau: input.maintenance_jusquau ?? null,
      notes: input.notes ?? null,
    });
  }
  return patch;
}
