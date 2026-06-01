import type { StageProgrammeInputV2 } from "@/lib/types/v2";

const OPTIONAL_FLAGS = ["terrains", "restauration", "transport_avion", "kinesitherapie"] as const;

function assignDefined(
  payload: Record<string, unknown>,
  data: Partial<StageProgrammeInputV2>,
  keys: (keyof StageProgrammeInputV2)[]
) {
  for (const key of keys) {
    if (data[key] !== undefined) payload[key] = data[key] as unknown;
  }
}

/** Payload INSERT stages_programme — flags optionnels seulement si fournis (évite colonnes absentes en prod). */
export function buildStageProgrammeWritePayload(data: StageProgrammeInputV2): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    source: data.source ?? "FRMT",
    categorie: data.categorie,
    stage_action: data.stage_action,
    date_debut: data.date_debut,
    date_fin: data.date_fin,
    nombre_joueurs: data.nombre_joueurs,
    nombre_encadrants: data.nombre_encadrants,
    hebergement: data.hebergement ?? false,
    chambres: data.chambres ?? 0,
    lieu: data.lieu,
    notes: data.notes,
    statut: data.statut ?? "prevu",
    infrastructure_ids: data.infrastructure_ids ?? [],
    entraineur_ids: data.entraineur_ids ?? [],
    materiel_assignations: data.materiel_assignations ?? [],
    budget_prevu: data.budget_prevu ?? null,
    budget_reel: data.budget_reel ?? null,
  };

  assignDefined(payload, data, [...OPTIONAL_FLAGS]);

  return payload;
}

/** Payload PATCH — uniquement les champs présents dans `data`. */
export function buildStageProgrammePatchPayload(data: Partial<StageProgrammeInputV2>): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  assignDefined(payload, data, [
    "source",
    "categorie",
    "stage_action",
    "date_debut",
    "date_fin",
    "nombre_joueurs",
    "nombre_encadrants",
    "hebergement",
    "chambres",
    "lieu",
    "notes",
    "statut",
    "infrastructure_ids",
    "entraineur_ids",
    "materiel_assignations",
    "budget_prevu",
    "budget_reel",
    ...OPTIONAL_FLAGS,
  ]);
  return payload;
}
