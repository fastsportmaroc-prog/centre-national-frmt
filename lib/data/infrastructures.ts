import { logHistorique } from "@/lib/audit/historique";
import { getSupabaseDataClient, isSupabaseDataClientReady } from "@/lib/supabase/data-client";
import { shouldUseLocalTestStorage } from "@/lib/local-test/mode";
import { localGetInfrastructures } from "@/lib/local-test/data-access";
import type {
  Infrastructure,
  InfrastructureInput,
  InfrastructureUsage,
  StatutInfrastructure,
} from "@/lib/types/infrastructures";

export async function getInfrastructures(): Promise<Infrastructure[]> {
  if (shouldUseLocalTestStorage()) return localGetInfrastructures();
  if (!(await isSupabaseDataClientReady())) return [];
  const supabase = await getSupabaseDataClient();
  const { data, error } = await supabase.from("infrastructures").select("*").order("nom");
  if (error) {
    console.warn("[Supabase] infrastructures:", error.message);
    return [];
  }
  return (data ?? []) as Infrastructure[];
}

export async function createInfrastructure(input: InfrastructureInput): Promise<Infrastructure> {
  const supabase = await getSupabaseDataClient();
  const { data, error } = await supabase.from("infrastructures").insert(input).select().single();
  if (error) throw new Error(error.message);
  const item = data as Infrastructure;
  await logHistorique({
    action: "creation",
    module: "infrastructures",
    entite_id: item.id,
    entite_label: item.nom,
    ancienne_valeur: null,
    nouvelle_valeur: item.statut,
    commentaire: null,
  });
  return item;
}

export async function updateInfrastructure(
  id: string,
  input: Partial<InfrastructureInput>
): Promise<Infrastructure> {
  const supabase = await getSupabaseDataClient();
  const { data, error } = await supabase
    .from("infrastructures")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  const item = data as Infrastructure;
  await logHistorique({
    action: "modification",
    module: "infrastructures",
    entite_id: id,
    entite_label: item.nom,
    ancienne_valeur: null,
    nouvelle_valeur: item.statut,
    commentaire: null,
  });
  return item;
}

export async function setInfrastructureStatus(
  id: string,
  statut: StatutInfrastructure
): Promise<Infrastructure> {
  return updateInfrastructure(id, { statut });
}

export async function deleteInfrastructure(id: string): Promise<void> {
  const supabase = await getSupabaseDataClient();
  const { data: before } = await supabase
    .from("infrastructures")
    .select("nom, statut, type")
    .eq("id", id)
    .single();

  if (before?.type === "terrain") {
    await supabase.from("reservations").delete().eq("court_id", id);
  }

  const { error } = await supabase.from("infrastructures").delete().eq("id", id);
  if (error) throw new Error(error.message);

  if (before) {
    await logHistorique({
      action: "suppression",
      module: "infrastructures",
      entite_id: id,
      entite_label: before.nom,
      ancienne_valeur: before.statut,
      nouvelle_valeur: null,
      commentaire: null,
    });
  }
}

export async function getInfrastructureUsage(
  infrastructureId: string
): Promise<InfrastructureUsage[]> {
  const supabase = await getSupabaseDataClient();
  const { data, error } = await supabase
    .from("infrastructure_usages")
    .select("*")
    .eq("infrastructure_id", infrastructureId)
    .order("date_debut", { ascending: false });
  if (error) {
    console.warn("[Supabase] infrastructure_usages:", error.message);
    return [];
  }
  return (data ?? []) as InfrastructureUsage[];
}

export async function addInfrastructureUsage(input: InfrastructureUsage): Promise<void> {
  if (shouldUseLocalTestStorage()) {
    const { readJson, writeJson, newLocalId } = await import("@/lib/local-test/storage");
    const usages = readJson<(InfrastructureUsage & { id: string })[]>(
      "infrastructure_usages",
      []
    );
    usages.push({ ...input, id: newLocalId() });
    writeJson("infrastructure_usages", usages.slice(0, 2000));
    return;
  }
  const supabase = await getSupabaseDataClient();
  const { error } = await supabase.from("infrastructure_usages").insert(input);
  if (error) throw new Error(error.message);
}
