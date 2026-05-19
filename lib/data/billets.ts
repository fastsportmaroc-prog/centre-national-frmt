import { getSupabaseDataClient } from "@/lib/supabase/data-client";
import { logHistorique } from "@/lib/audit/historique";
import type { DemandeBilletAvion, DemandeBilletAvionInput } from "@/lib/types/logistique";
import { createDepenseFromBillet } from "@/lib/data/joueur-depenses";

export type AccordBilletParams = {
  aller_retour: boolean;
  date_retour: string | null;
  duree_sejour_jours: number | null;
  prix_billet: number;
  prix_devise: string;
  validateur: string;
};

export async function getBilletsAvion(): Promise<DemandeBilletAvion[]> {
  const supabase = await getSupabaseDataClient();
  const { data, error } = await supabase
    .from("demandes_billet_avion")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as DemandeBilletAvion[];
}

export async function getBilletAvionById(id: string): Promise<DemandeBilletAvion | null> {
  const supabase = await getSupabaseDataClient();
  const { data, error } = await supabase
    .from("demandes_billet_avion")
    .select("*")
    .eq("id", id)
    .single();
  if (error) return null;
  return data as DemandeBilletAvion;
}

export async function createBilletAvion(
  input: DemandeBilletAvionInput
): Promise<DemandeBilletAvion> {
  const supabase = await getSupabaseDataClient();
  const { data, error } = await supabase
    .from("demandes_billet_avion")
    .insert(input)
    .select()
    .single();
  if (error) throw new Error(error.message);
  const item = data as DemandeBilletAvion;

  await logHistorique({
    action: "creation",
    module: "billets",
    entite_id: item.id,
    entite_label: `${item.ville_depart} → ${item.ville_arrivee}`,
    ancienne_valeur: null,
    nouvelle_valeur: item.statut,
    commentaire: null,
  });
  return item;
}

export async function updateBilletAvion(
  id: string,
  input: Partial<DemandeBilletAvionInput>,
  commentaire?: string
): Promise<DemandeBilletAvion> {
  const supabase = await getSupabaseDataClient();
  const { data: beforeData } = await supabase
    .from("demandes_billet_avion")
    .select("statut")
    .eq("id", id)
    .single();
  const before = beforeData as Pick<DemandeBilletAvion, "statut"> | null;

  const { data, error } = await supabase
    .from("demandes_billet_avion")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  const updated = data as DemandeBilletAvion;

  await logHistorique({
    action:
      input.statut === "refusee"
        ? "refus"
        : input.statut === "envoyee"
          ? "envoi_email"
          : input.statut
            ? "validation"
            : "modification",
    module: "billets",
    entite_id: id,
    entite_label: `${updated.ville_depart} → ${updated.ville_arrivee}`,
    ancienne_valeur: before?.statut ?? null,
    nouvelle_valeur: updated.statut,
    commentaire: commentaire ?? null,
  });
  return updated;
}

/** @deprecated Utiliser accorderBilletAvion (prix + retour figé à l'accord) */
export async function validerBillet(
  id: string,
  validateur: string
): Promise<DemandeBilletAvion> {
  return updateBilletAvion(
    id,
    {
      statut: "validee_direction",
      validateur,
      date_validation: new Date().toISOString(),
    },
    "Billet validé"
  );
}

/** Accord direction : type de vol, date retour, prix et imputation dépenses joueur */
export async function accorderBilletAvion(
  id: string,
  params: AccordBilletParams
): Promise<DemandeBilletAvion> {
  const billet = await getBilletAvionById(id);
  if (!billet) throw new Error("Demande introuvable");

  let depense_joueur_id = billet.depense_joueur_id;
  let depense_enregistree = billet.depense_enregistree;

  if (params.prix_billet > 0 && billet.joueur_concerne_id && !depense_enregistree) {
    const draft: DemandeBilletAvion = {
      ...billet,
      aller_retour_accorde: params.aller_retour,
      aller_retour: params.aller_retour,
    };
    const depense = await createDepenseFromBillet(
      draft,
      params.prix_billet,
      params.prix_devise
    );
    if (depense) {
      depense_joueur_id = depense.id;
      depense_enregistree = true;
    }
  }

  return updateBilletAvion(
    id,
    {
      statut: "validee_direction",
      validateur: params.validateur,
      date_validation: new Date().toISOString(),
      aller_retour: params.aller_retour,
      aller_retour_accorde: params.aller_retour,
      date_retour: params.aller_retour ? params.date_retour : null,
      date_retour_accorde: params.aller_retour ? params.date_retour : null,
      duree_sejour_jours: params.duree_sejour_jours,
      prix_billet: params.prix_billet,
      prix_devise: params.prix_devise,
      depense_joueur_id,
      depense_enregistree,
    },
    `Accord — ${params.prix_billet} ${params.prix_devise}`
  );
}

export async function refuserBillet(
  id: string,
  motif: string
): Promise<DemandeBilletAvion> {
  return updateBilletAvion(id, { statut: "refusee", notes: motif }, motif);
}

export async function envoyerBilletAgence(id: string): Promise<DemandeBilletAvion> {
  return updateBilletAvion(id, { statut: "envoyee" }, "Envoyé à l'agence de voyage");
}
