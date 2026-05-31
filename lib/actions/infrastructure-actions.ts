"use server";

import { revalidatePath } from "next/cache";
import { requireParametresAdmin } from "@/lib/auth/require-parametres-admin";
import { permissionsForRole } from "@/lib/auth/app-permissions";
import { createSupabaseAdminClient } from "@/lib/supabase/admin.server";
import { getSupabaseServerDataClient } from "@/lib/supabase/data-client.server";
import {
  mergeInfrastructureCatalog,
  terrainRowToInfrastructureInput,
  type InfrastructureCatalogItem,
} from "@/lib/infrastructures/catalog-merge";
import type {
  Infrastructure,
  InfrastructureInput,
  StatutInfrastructure,
} from "@/lib/types/infrastructures";

function requireAdmin() {
  return requireParametresAdmin().then((ctx) => {
    if (!ctx) return { ok: false as const, error: "Non authentifié ou droits insuffisants." };
    return { ok: true as const, user: ctx.user };
  });
}

async function getInfrastructuresSupabase() {
  const admin = createSupabaseAdminClient();
  return admin ?? (await getSupabaseServerDataClient());
}

async function fetchTerrainsRows(
  supabase: Awaited<ReturnType<typeof getSupabaseServerDataClient>>
): Promise<TerrainRow[]> {
  let res = await supabase.from("terrains").select("*").order("ordre").order("nom");
  if (res.error) {
    console.warn("[terrains] list (ordre):", res.error.message);
    res = await supabase.from("terrains").select("*").order("nom");
  }
  if (res.error) {
    console.warn("[terrains] list:", res.error.message);
    return [];
  }
  return (res.data ?? []) as TerrainRow[];
}

export async function listInfrastructuresAction(): Promise<Infrastructure[]> {
  const catalog = await listInfrastructuresCatalogAction();
  return catalog.items.filter((i) => i.inCatalog);
}

export async function listInfrastructuresCatalogAction(): Promise<{
  items: InfrastructureCatalogItem[];
  stats: { infrastructures: number; terrainsOnly: number; total: number };
}> {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return { items: [], stats: { infrastructures: 0, terrainsOnly: 0, total: 0 } };
  }
  const supabase = await getInfrastructuresSupabase();

  const { data: infrastructures, error: infraErr } = await supabase
    .from("infrastructures")
    .select("*")
    .order("nom");
  if (infraErr) console.warn("[infrastructures] list:", infraErr.message);

  const terrainsRows = await fetchTerrainsRows(supabase);

  const items = mergeInfrastructureCatalog(
    (infrastructures ?? []) as Infrastructure[],
    terrainsRows,
    []
  );

  return {
    items,
    stats: {
      infrastructures: items.filter((i) => i.catalogSource === "infrastructures").length,
      terrainsOnly: items.filter((i) => i.catalogSource === "terrains" && !i.inCatalog).length,
      total: items.length,
    },
  };
}

type TerrainRow = {
  id: string;
  nom: string;
  type?: string | null;
  surface?: string | null;
  capacite?: number | null;
  actif?: boolean | null;
};

/** Importe un terrain planning dans la table `infrastructures`. */
export async function importInfrastructureToCatalogAction(
  sourceId: string
): Promise<{ ok: boolean; data?: Infrastructure; error?: string }> {
  const auth = await requireAdmin();
  if (!auth.ok) return { ok: false, error: auth.error };

  const supabase = await getInfrastructuresSupabase();
  const { data: row } = await supabase.from("terrains").select("*").eq("id", sourceId).maybeSingle();
  if (!row) return { ok: false, error: "Terrain introuvable." };
  return createInfrastructureAction(terrainRowToInfrastructureInput(row as TerrainRow));
}

/** Importe en masse les terrains et courts pas encore dans le catalogue. */
export async function importAllExistingToCatalogAction(): Promise<{
  ok: boolean;
  imported: number;
  skipped: number;
  errors: string[];
}> {
  const auth = await requireAdmin();
  if (!auth.ok) return { ok: false, imported: 0, skipped: 0, errors: [auth.error] };

  const { items } = await listInfrastructuresCatalogAction();
  const toImport = items.filter((i) => !i.inCatalog);
  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const item of toImport) {
    if (item.catalogSource === "infrastructures") {
      skipped++;
      continue;
    }
    if (item.catalogSource !== "terrains") {
      skipped++;
      continue;
    }
    const res = await importInfrastructureToCatalogAction(item.sourceId);
    if (res.ok) imported++;
    else {
      skipped++;
      if (res.error) errors.push(`${item.nom}: ${res.error}`);
    }
  }

  revalidatePath("/v2/parametres");
  revalidatePath("/v2/infrastructures");
  return { ok: true, imported, skipped, errors };
}

export async function createInfrastructureAction(
  input: InfrastructureInput
): Promise<{ ok: boolean; data?: Infrastructure; error?: string }> {
  const auth = await requireAdmin();
  if (!auth.ok) return { ok: false, error: auth.error };

  const nom = input.nom.trim();
  if (!nom) return { ok: false, error: "Le nom est obligatoire." };

  const supabase = await getSupabaseServerDataClient();
  const payload = {
    nom,
    type: input.type,
    surface: input.surface,
    capacite: Math.max(1, input.capacite || 1),
    actif: input.actif ?? true,
    statut: input.statut ?? "disponible",
    notes: input.notes?.trim() || null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase.from("infrastructures").insert(payload).select().single();
  if (error) {
    const msg = error.message.includes("row-level security")
      ? "Création refusée (RLS). Vérifiez les politiques Supabase sur infrastructures."
      : error.message;
    return { ok: false, error: msg };
  }

  revalidatePath("/v2/parametres");
  revalidatePath("/v2/infrastructures");
  revalidatePath("/v2/reservations");
  return { ok: true, data: data as Infrastructure };
}

export async function updateInfrastructureAction(
  id: string,
  input: Partial<InfrastructureInput>
): Promise<{ ok: boolean; data?: Infrastructure; error?: string }> {
  const auth = await requireAdmin();
  if (!auth.ok) return { ok: false, error: auth.error };

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.nom !== undefined) patch.nom = input.nom.trim();
  if (input.type !== undefined) patch.type = input.type;
  if (input.surface !== undefined) patch.surface = input.surface;
  if (input.capacite !== undefined) patch.capacite = Math.max(1, input.capacite || 1);
  if (input.actif !== undefined) patch.actif = input.actif;
  if (input.statut !== undefined) patch.statut = input.statut;
  if (input.notes !== undefined) patch.notes = input.notes?.trim() || null;

  const supabase = await getInfrastructuresSupabase();
  const { data, error } = await supabase
    .from("infrastructures")
    .update(patch)
    .eq("id", id)
    .select()
    .single();

  if (error) return { ok: false, error: error.message };

  revalidatePath("/v2/parametres");
  revalidatePath("/v2/infrastructures");
  return { ok: true, data: data as Infrastructure };
}

export async function deleteInfrastructureAction(
  id: string
): Promise<{ ok: boolean; error?: string }> {
  const auth = await requireAdmin();
  if (!auth.ok) return { ok: false, error: auth.error };
  if (!permissionsForRole(auth.user.appRole).canDelete) {
    return { ok: false, error: "Seul un administrateur peut supprimer une infrastructure." };
  }

  const supabase = await getInfrastructuresSupabase();

  const { data: before } = await supabase
    .from("infrastructures")
    .select("nom, type")
    .eq("id", id)
    .maybeSingle();

  if (!before) return { ok: false, error: "Infrastructure introuvable." };

  await supabase.from("reservations_infrastructure").delete().eq("infrastructure_id", id);
  if (before.type === "terrain") {
    await supabase.from("reservations").delete().eq("court_id", id);
  }

  const { error } = await supabase.from("infrastructures").delete().eq("id", id);
  if (error) {
    if (error.message.includes("foreign key") || error.message.includes("violates")) {
      return {
        ok: false,
        error:
          "Impossible de supprimer : cette infrastructure est encore utilisée (réservations, stages, etc.).",
      };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath("/v2/parametres");
  revalidatePath("/v2/infrastructures");
  revalidatePath("/v2/reservations");
  return { ok: true };
}

export async function setInfrastructureStatutAction(
  id: string,
  statut: StatutInfrastructure
): Promise<{ ok: boolean; error?: string }> {
  return updateInfrastructureAction(id, { statut });
}
