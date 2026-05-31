import { getSupabaseDataClient, isSupabaseDataClientReady } from "@/lib/supabase/data-client";
import { shouldUseLocalTestStorage } from "@/lib/local-test/mode";
import { localGetBesoinsRestauration } from "@/lib/local-test/data-access";
import { localCreateBesoinRestauration } from "@/lib/local-test/provision-local";
import { logHistorique } from "@/lib/audit/historique";
import { computePrestataireEtats, syncBesoinStatutFromFacture } from "@/lib/utils/restauration";
import type {
  BesoinRestauration,
  BesoinRestaurationInput,
  FactureRestauration,
  FactureRestaurationInput,
  PrestataireEtatGeneral,
  PrestataireRestauration,
  PrestataireRestaurationInput,
} from "@/lib/types/restauration";

async function resolvePrestataireNom(prestataireId: string | null): Promise<string | null> {
  if (!prestataireId) return null;
  const p = await getPrestataireById(prestataireId);
  return p?.nom ?? null;
}

// ——— Prestataires ———

export async function getPrestatairesRestauration(): Promise<PrestataireRestauration[]> {
  if (shouldUseLocalTestStorage() || !(await isSupabaseDataClientReady())) {
    return [];
  }
  const supabase = await getSupabaseDataClient();
  const { data, error } = await supabase
    .from("prestataires_restauration")
    .select("*")
    .order("nom");
  if (error) {
    console.warn("[Supabase] prestataires_restauration:", error.message);
    return [];
  }
  return (data ?? []) as PrestataireRestauration[];
}

export async function getPrestataireById(id: string): Promise<PrestataireRestauration | null> {
  if (shouldUseLocalTestStorage() || !(await isSupabaseDataClientReady())) {
    return null;
  }
  const supabase = await getSupabaseDataClient();
  const { data, error } = await supabase
    .from("prestataires_restauration")
    .select("*")
    .eq("id", id)
    .single();
  if (error) return null;
  return data as PrestataireRestauration;
}

export async function createPrestataireRestauration(
  input: PrestataireRestaurationInput
): Promise<PrestataireRestauration> {
  const supabase = await getSupabaseDataClient();
  const { data, error } = await supabase
    .from("prestataires_restauration")
    .insert(input)
    .select()
    .single();
  if (error) throw new Error(error.message);
  const item = data as PrestataireRestauration;

  await logHistorique({
    action: "creation",
    module: "restauration",
    entite_id: item.id,
    entite_label: item.nom,
    ancienne_valeur: null,
    nouvelle_valeur: "prestataire",
    commentaire: null,
  });
  return item;
}

export async function updatePrestataireRestauration(
  id: string,
  input: Partial<PrestataireRestaurationInput>
): Promise<PrestataireRestauration> {
  const supabase = await getSupabaseDataClient();
  const { data, error } = await supabase
    .from("prestataires_restauration")
    .update(input)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as PrestataireRestauration;
}

export async function deletePrestataireRestauration(id: string): Promise<void> {
  const supabase = await getSupabaseDataClient();

  const { count, error: countError } = await supabase
    .from("factures_restauration")
    .select("id", { count: "exact", head: true })
    .eq("prestataire_id", id);
  if (countError) throw new Error(countError.message);
  if ((count ?? 0) > 0) {
    throw new Error(
      "Impossible de supprimer : des factures sont encore liées à ce prestataire. Supprimez-les d'abord."
    );
  }

  await supabase
    .from("besoins_restauration")
    .update({ prestataire_id: null, prestataire_nom: null })
    .eq("prestataire_id", id);

  const { error } = await supabase.from("prestataires_restauration").delete().eq("id", id);
  if (error) throw new Error(error.message);

  await logHistorique({
    action: "suppression",
    module: "restauration",
    entite_id: id,
    entite_label: "Prestataire restauration",
    ancienne_valeur: id,
    nouvelle_valeur: null,
    commentaire: null,
  });
}

// ——— Besoins / événements ———

export async function getBesoinsRestauration(): Promise<BesoinRestauration[]> {
  if (shouldUseLocalTestStorage()) {
    return localGetBesoinsRestauration();
  }
  if (!(await isSupabaseDataClientReady())) {
    return [];
  }
  const supabase = await getSupabaseDataClient();
  const { data, error } = await supabase
    .from("besoins_restauration")
    .select("*")
    .order("date_besoin", { ascending: false });
  if (error) {
    console.warn("[Supabase] besoins_restauration:", error.message);
    return [];
  }
  return (data ?? []) as BesoinRestauration[];
}

export async function createBesoinRestauration(
  input: BesoinRestaurationInput
): Promise<BesoinRestauration> {
  if (shouldUseLocalTestStorage()) {
    return localCreateBesoinRestauration(input);
  }
  const prestataire_nom = await resolvePrestataireNom(input.prestataire_id);
  const payload = { ...input, prestataire_nom };
  const supabase = await getSupabaseDataClient();
  const { data, error } = await supabase
    .from("besoins_restauration")
    .insert(payload)
    .select()
    .single();
  if (error) throw new Error(error.message);
  const item = data as BesoinRestauration;

  await logHistorique({
    action: "creation",
    module: "restauration",
    entite_id: item.id,
    entite_label: item.titre,
    ancienne_valeur: null,
    nouvelle_valeur: item.statut,
    commentaire: item.type_evenement,
  });
  return item;
}

export async function updateBesoinRestauration(
  id: string,
  input: Partial<BesoinRestaurationInput>
): Promise<BesoinRestauration> {
  const supabase = await getSupabaseDataClient();
  const { data: beforeData } = await supabase
    .from("besoins_restauration")
    .select("statut")
    .eq("id", id)
    .single();
  const before = beforeData as Pick<BesoinRestauration, "statut"> | null;

  let prestataire_nom: string | null | undefined;
  if (input.prestataire_id !== undefined) {
    prestataire_nom = await resolvePrestataireNom(input.prestataire_id);
  }

  const patch = {
    ...input,
    ...(prestataire_nom !== undefined ? { prestataire_nom } : {}),
  };

  const { data, error } = await supabase
    .from("besoins_restauration")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  const updated = data as BesoinRestauration;

  await logHistorique({
    action: input.statut ? "validation" : "modification",
    module: "restauration",
    entite_id: id,
    entite_label: updated.titre,
    ancienne_valeur: before?.statut ?? null,
    nouvelle_valeur: updated.statut,
    commentaire: null,
  });
  return updated;
}

export async function deleteBesoinRestauration(id: string): Promise<void> {
  const supabase = await getSupabaseDataClient();
  const { error } = await supabase.from("besoins_restauration").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ——— Factures ———

export async function getFacturesRestauration(): Promise<FactureRestauration[]> {
  const supabase = await getSupabaseDataClient();
  const { data, error } = await supabase
    .from("factures_restauration")
    .select("*")
    .order("date_facture", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as FactureRestauration[];
}

export async function createFactureRestauration(
  input: FactureRestaurationInput
): Promise<FactureRestauration> {
  const supabase = await getSupabaseDataClient();
  const { data, error } = await supabase
    .from("factures_restauration")
    .insert(input)
    .select()
    .single();
  if (error) throw new Error(error.message);
  const item = data as FactureRestauration;

  const statutBesoin = syncBesoinStatutFromFacture(item.statut);
  if (statutBesoin && item.besoin_id) {
    await updateBesoinRestauration(item.besoin_id, { statut: statutBesoin });
  }

  await logHistorique({
    action: "creation",
    module: "restauration",
    entite_id: item.id,
    entite_label: item.numero_facture,
    ancienne_valeur: null,
    nouvelle_valeur: item.statut,
    commentaire: String(item.montant_ttc),
  });
  return item;
}

export async function updateFactureRestauration(
  id: string,
  input: Partial<FactureRestaurationInput>
): Promise<FactureRestauration> {
  const supabase = await getSupabaseDataClient();
  const { data: beforeData } = await supabase
    .from("factures_restauration")
    .select("statut")
    .eq("id", id)
    .single();
  const before = beforeData as Pick<FactureRestauration, "statut"> | null;

  const { data, error } = await supabase
    .from("factures_restauration")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  const updated = data as FactureRestauration;

  const statutBesoin = input.statut ? syncBesoinStatutFromFacture(input.statut) : null;
  if (statutBesoin && updated.besoin_id) {
    await updateBesoinRestauration(updated.besoin_id, { statut: statutBesoin });
  }

  await logHistorique({
    action: input.statut === "payee" ? "validation" : "modification",
    module: "restauration",
    entite_id: id,
    entite_label: updated.numero_facture,
    ancienne_valeur: before?.statut ?? null,
    nouvelle_valeur: updated.statut,
    commentaire: null,
  });
  return updated;
}

export async function deleteFactureRestauration(id: string): Promise<void> {
  const supabase = await getSupabaseDataClient();
  const { error } = await supabase.from("factures_restauration").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ——— État général prestataires ———

export async function getPrestatairesEtatGeneral(): Promise<PrestataireEtatGeneral[]> {
  const [prestataires, besoins, factures] = await Promise.all([
    getPrestatairesRestauration(),
    getBesoinsRestauration(),
    getFacturesRestauration(),
  ]);
  return computePrestataireEtats(prestataires, besoins, factures);
}
