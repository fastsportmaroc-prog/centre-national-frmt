import { getSupabaseDataClient } from "@/lib/supabase/data-client";
import type { DemandeBilletAvion } from "@/lib/types/logistique";
import type { JoueurDepense, JoueurDepenseInput } from "@/lib/types/joueur-depenses";

export async function getDepensesByJoueur(joueurId: string): Promise<JoueurDepense[]> {
  const supabase = await getSupabaseDataClient();
  const { data, error } = await supabase
    .from("joueur_depenses")
    .select("*")
    .eq("joueur_id", joueurId)
    .order("date_depense", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as JoueurDepense[];
}

export async function getTotalDepensesJoueur(joueurId: string): Promise<number> {
  const list = await getDepensesByJoueur(joueurId);
  return list.reduce((sum, d) => sum + d.montant, 0);
}

export async function createJoueurDepense(input: JoueurDepenseInput): Promise<JoueurDepense> {
  const supabase = await getSupabaseDataClient();
  const { data, error } = await supabase
    .from("joueur_depenses")
    .insert(input)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as JoueurDepense;
}

export async function createDepenseFromBillet(
  billet: DemandeBilletAvion,
  montant: number,
  devise: string
): Promise<JoueurDepense | null> {
  if (!billet.joueur_concerne_id || montant <= 0) return null;

  const dep = billet.aeroport_depart_code ?? billet.ville_depart.slice(0, 3);
  const arr = billet.aeroport_arrivee_code ?? billet.ville_arrivee.slice(0, 3);
  const libelle = `Billet avion ${dep} → ${arr}${billet.aller_retour_accorde ?? billet.aller_retour ? " (A/R)" : ""}`;

  return createJoueurDepense({
    joueur_id: billet.joueur_concerne_id,
    date_depense: new Date().toISOString().split("T")[0]!,
    categorie: "billet_avion",
    libelle,
    montant,
    devise,
    reference_type: "billet_avion",
    reference_id: billet.id,
  });
}
