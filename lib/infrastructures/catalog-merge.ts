import type {
  Infrastructure,
  InfrastructureInput,
  SurfaceInfrastructure,
  TypeInfrastructure,
} from "@/lib/types/infrastructures";

export type InfrastructureCatalogSource = "infrastructures" | "terrains" | "courts";

export type InfrastructureCatalogItem = Infrastructure & {
  catalogSource: InfrastructureCatalogSource;
  /** Présent dans la table principale `infrastructures` */
  inCatalog: boolean;
  /** ID source si hors catalogue (pour import) */
  sourceId: string;
};

function normName(n: string): string {
  return n
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function mapTerrainType(type: string | null | undefined): TypeInfrastructure {
  const v = (type ?? "").toLowerCase();
  if (v.includes("fitness") || v.includes("physique") || v.includes("salle-fitness"))
    return "emplacement_physique";
  if (v.includes("natation") || v.includes("piscine")) return "natation";
  if (v.includes("gym") || v.includes("gymnase")) return "autre";
  if (v.includes("court") || v.includes("tennis") || v === "terrain") return "terrain";
  return "terrain";
}

/** Normalise un enregistrement table `infrastructures` (types legacy court-tennis, etc.). */
export function normalizeInfrastructureRow(i: Infrastructure): Infrastructure {
  return {
    ...i,
    type: mapTerrainType(i.type),
    surface: mapSurface(i.surface),
  };
}

function mapSurface(surface: string | null | undefined): SurfaceInfrastructure {
  const v = (surface ?? "").toLowerCase().replace(/-/g, "_");
  if (v.includes("terre")) return "terre_battue";
  if (v.includes("dur") || v.includes("hard")) return "dur";
  if (v.includes("indoor") || v.includes("interieur")) return "indoor";
  if (v.includes("exterieur") || v.includes("exterior")) return "exterieur";
  return "autre";
}

function mapCourtSurface(surface: string | null | undefined): SurfaceInfrastructure {
  const v = (surface ?? "").toLowerCase();
  if (v.includes("terre")) return "terre_battue";
  if (v.includes("dur")) return "dur";
  if (v.includes("indoor")) return "indoor";
  return "autre";
}

export function terrainRowToInfrastructureInput(row: {
  nom: string;
  type?: string | null;
  surface?: string | null;
  capacite?: number | null;
  actif?: boolean | null;
}): InfrastructureInput {
  return {
    nom: row.nom.trim(),
    type: mapTerrainType(row.type),
    surface: mapSurface(row.surface),
    capacite: Math.max(1, row.capacite ?? 4),
    actif: row.actif ?? true,
    statut: "disponible",
    notes: "Importé depuis la table terrains",
  };
}

export function courtRowToInfrastructureInput(row: {
  nom: string;
  surface?: string | null;
  actif?: boolean | null;
}): InfrastructureInput {
  return {
    nom: row.nom.trim(),
    type: "terrain",
    surface: mapCourtSurface(row.surface),
    capacite: 4,
    actif: row.actif ?? true,
    statut: "disponible",
    notes: "Importé depuis la table courts (legacy)",
  };
}

export function mergeInfrastructureCatalog(
  infrastructures: Infrastructure[],
  terrainsRows: {
    id: string;
    nom: string;
    type?: string | null;
    surface?: string | null;
    capacite?: number | null;
    actif?: boolean | null;
    created_at?: string;
    updated_at?: string;
  }[],
  courtsRows: {
    id: string;
    nom: string;
    surface?: string | null;
    actif?: boolean | null;
    created_at?: string;
  }[]
): InfrastructureCatalogItem[] {
  const byId = new Map<string, InfrastructureCatalogItem>();
  const namesInCatalog = new Set(infrastructures.map((i) => normName(i.nom)));

  for (const raw of infrastructures) {
    const i = normalizeInfrastructureRow(raw);
    byId.set(i.id, {
      ...i,
      catalogSource: "infrastructures",
      inCatalog: true,
      sourceId: i.id,
    });
  }

  for (const t of terrainsRows) {
    if (byId.has(t.id)) {
      const existing = byId.get(t.id)!;
      if (existing.catalogSource === "infrastructures") continue;
    }
    const nameKey = normName(t.nom);
    const duplicateName = [...byId.values()].some((x) => normName(x.nom) === nameKey);
    if (duplicateName && !byId.has(t.id)) continue;

    const item: InfrastructureCatalogItem = {
      id: t.id,
      nom: t.nom,
      type: mapTerrainType(t.type),
      surface: mapSurface(t.surface),
      capacite: Math.max(1, t.capacite ?? 4),
      actif: t.actif ?? true,
      statut: "disponible",
      notes: null,
      created_at: t.created_at ?? new Date().toISOString(),
      updated_at: t.updated_at ?? t.created_at ?? new Date().toISOString(),
      catalogSource: "terrains",
      inCatalog: namesInCatalog.has(nameKey) || byId.has(t.id),
      sourceId: t.id,
    };
    if (!byId.has(t.id)) byId.set(t.id, item);
  }

  for (const c of courtsRows) {
    if (byId.has(c.id)) continue;
    const nameKey = normName(c.nom);
    if ([...byId.values()].some((x) => normName(x.nom) === nameKey)) continue;

    byId.set(c.id, {
      id: c.id,
      nom: c.nom,
      type: "terrain",
      surface: mapCourtSurface(c.surface),
      capacite: 4,
      actif: c.actif ?? true,
      statut: "disponible",
      notes: null,
      created_at: c.created_at ?? new Date().toISOString(),
      updated_at: c.created_at ?? new Date().toISOString(),
      catalogSource: "courts",
      inCatalog: namesInCatalog.has(nameKey),
      sourceId: c.id,
    });
  }

  return [...byId.values()].sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
}
