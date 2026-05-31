import { getInfrastructures } from "@/lib/data/infrastructures";
import { getTerrains } from "@/lib/data/terrains";
import { shouldUseLocalTestStorage } from "@/lib/local-test/mode";
import { localGetInfrastructures } from "@/lib/local-test/data-access";
import {
  mergeInfrastructureCatalog,
  type InfrastructureCatalogItem,
} from "@/lib/infrastructures/catalog-merge";
import type { Infrastructure } from "@/lib/types/infrastructures";

export type InfrastructureCatalogStats = {
  infrastructures: number;
  terrainsOnly: number;
  total: number;
};

function computeStats(items: InfrastructureCatalogItem[]): InfrastructureCatalogStats {
  return {
    infrastructures: items.filter((i) => i.catalogSource === "infrastructures").length,
    terrainsOnly: items.filter((i) => i.catalogSource === "terrains" && !i.inCatalog).length,
    total: items.length,
  };
}

/** Charge le catalogue terrains / infrastructures (client — même session que le reste de l'app). */
export async function loadInfrastructureCatalog(): Promise<{
  items: InfrastructureCatalogItem[];
  stats: InfrastructureCatalogStats;
  error?: string;
}> {
  let infrastructures: Infrastructure[] = [];

  if (shouldUseLocalTestStorage()) {
    infrastructures = localGetInfrastructures();
  } else {
    infrastructures = await getInfrastructures();
  }

  const terrainsRows: {
    id: string;
    nom: string;
    type?: string | null;
    surface?: string | null;
    capacite?: number | null;
    actif?: boolean | null;
  }[] = [];

  try {
    const fromTerrains = await getTerrains();
    for (const t of fromTerrains ?? []) {
      terrainsRows.push({
        id: String(t.id),
        nom: String(t.nom ?? ""),
        type: t.type ?? null,
        surface: t.surface ?? null,
        capacite: t.capacite ?? null,
        actif: t.actif ?? true,
      });
    }
  } catch (e) {
    console.warn("[catalog] getTerrains:", e);
  }

  const items = mergeInfrastructureCatalog(infrastructures, terrainsRows, []).filter(
    (i) => i.catalogSource !== "courts"
  );
  return { items, stats: computeStats(items) };
}
