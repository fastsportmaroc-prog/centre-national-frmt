import { getSupabaseDataClient } from "@/lib/supabase/data-client";
import { logHistorique } from "@/lib/audit/historique";
import type {
  DemandeLogistique,
  DemandeLogistiqueInput,
} from "@/lib/types/logistique";

export async function getDemandesLogistique(): Promise<DemandeLogistique[]> {
  const supabase = await getSupabaseDataClient();
  const { data, error } = await supabase
    .from("demandes_logistique")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as DemandeLogistique[];
}

export async function createDemandeLogistique(
  input: DemandeLogistiqueInput
): Promise<DemandeLogistique> {
  const supabase = await getSupabaseDataClient();
  const { data, error } = await supabase
    .from("demandes_logistique")
    .insert(input)
    .select()
    .single();
  if (error) throw new Error(error.message);
  const item = data as DemandeLogistique;

  await logHistorique({
    action: "creation",
    module: "logistique",
    entite_id: item.id,
    entite_label: item.titre,
    ancienne_valeur: null,
    nouvelle_valeur: item.statut,
    commentaire: null,
  });
  return item;
}

export async function updateDemandeLogistique(
  id: string,
  input: Partial<DemandeLogistiqueInput>,
  commentaire?: string
): Promise<DemandeLogistique> {
  const supabase = await getSupabaseDataClient();
  const { data: beforeData } = await supabase
    .from("demandes_logistique")
    .select("statut")
    .eq("id", id)
    .single();
  const before = beforeData as Pick<DemandeLogistique, "statut"> | null;

  const { data, error } = await supabase
    .from("demandes_logistique")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  const updated = data as DemandeLogistique;

  await logHistorique({
    action: input.statut === "refusee" ? "refus" : input.statut ? "validation" : "modification",
    module: "logistique",
    entite_id: id,
    entite_label: updated.titre,
    ancienne_valeur: before?.statut ?? null,
    nouvelle_valeur: updated.statut,
    commentaire: commentaire ?? null,
  });
  return updated;
}

export async function validerDemandeDirection(
  id: string,
  validateur: string
): Promise<DemandeLogistique> {
  return updateDemandeLogistique(
    id,
    {
      statut: "validee_direction",
      validateur_direction: validateur,
      date_validation_direction: new Date().toISOString(),
    },
    "Validation direction"
  );
}

export async function validerDemandeLogistique(
  id: string,
  validateur: string
): Promise<DemandeLogistique> {
  return updateDemandeLogistique(
    id,
    {
      statut: "validee_logistique",
      validateur_logistique: validateur,
      date_validation_logistique: new Date().toISOString(),
    },
    "Validation service logistique"
  );
}

export async function refuserDemande(
  id: string,
  motif: string
): Promise<DemandeLogistique> {
  return updateDemandeLogistique(
    id,
    { statut: "refusee", motif_refus: motif },
    motif
  );
}

export async function deleteDemandeLogistique(id: string): Promise<void> {
  const supabase = await getSupabaseDataClient();
  const { error } = await supabase.from("demandes_logistique").delete().eq("id", id);
  if (error) throw new Error(error.message);

  await logHistorique({
    action: "suppression",
    module: "logistique",
    entite_id: id,
    entite_label: null,
    ancienne_valeur: null,
    nouvelle_valeur: null,
    commentaire: null,
  });
}
