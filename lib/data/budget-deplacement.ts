import { logHistorique } from "@/lib/audit/historique";
import { createJoueurDepense } from "@/lib/data/joueur-depenses";
import { getSupabaseDataClient } from "@/lib/supabase/data-client";
import type {
  BudgetDeplacement,
  BudgetDeplacementInput,
  BudgetDeplacementWithLignes,
  LigneBudgetDeplacement,
  LigneBudgetDeplacementInput,
} from "@/lib/types/budget-deplacement";

const now = () => new Date().toISOString();

export async function getBudgetsDeplacement(): Promise<BudgetDeplacementWithLignes[]> {
  const supabase = await getSupabaseDataClient();
  const { data, error } = await supabase
    .from("budget_deplacement")
    .select("*, lignes_budget_deplacement(*)")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return ((data ?? []) as (BudgetDeplacement & { lignes_budget_deplacement?: LigneBudgetDeplacement[] })[]).map((x) => ({
    ...x,
    lignes: x.lignes_budget_deplacement ?? [],
  }));
}

export async function createBudgetDeplacement(input: BudgetDeplacementInput): Promise<BudgetDeplacement> {
  const supabase = await getSupabaseDataClient();
  const { data, error } = await supabase.from("budget_deplacement").insert(input).select().single();
  if (error) throw new Error(error.message);
  const item = data as BudgetDeplacement;
  await logHistorique({
    action: "creation",
    module: "budget_deplacement",
    entite_id: item.id,
    entite_label: item.tournoi,
    ancienne_valeur: null,
    nouvelle_valeur: item.statut,
    commentaire: item.destination,
  });
  return item;
}

export async function addLigneBudgetDeplacement(
  input: LigneBudgetDeplacementInput
): Promise<LigneBudgetDeplacement> {
  const montant_total = input.quantite * input.prix_unitaire;
  const supabase = await getSupabaseDataClient();
  const { data, error } = await supabase
    .from("lignes_budget_deplacement")
    .insert({ ...input, montant_total })
    .select()
    .single();
  if (error) throw new Error(error.message);
  const item = data as LigneBudgetDeplacement;
  await logHistorique({
    action: "modification",
    module: "budget_deplacement",
    entite_id: input.budget_deplacement_id,
    entite_label: input.description,
    ancienne_valeur: null,
    nouvelle_valeur: `${montant_total} ${input.devise}`,
    commentaire: input.categorie,
  });
  return item;
}

export async function validateBudgetDeplacement(id: string, validePar: string): Promise<void> {
  const supabase = await getSupabaseDataClient();
  const { data: before } = await supabase
    .from("budget_deplacement")
    .select("tournoi, statut")
    .eq("id", id)
    .single();

  const { error } = await supabase
    .from("budget_deplacement")
    .update({
      statut: "valide",
      valide_par: validePar,
      date_validation: now(),
      updated_at: now(),
    })
    .eq("id", id);
  if (error) throw new Error(error.message);

  await logHistorique({
    action: "validation",
    module: "budget_deplacement",
    entite_id: id,
    entite_label: before?.tournoi ?? null,
    ancienne_valeur: before?.statut ?? "brouillon",
    nouvelle_valeur: "valide",
    commentaire: validePar,
  });
}

export async function imputeBudgetAuJoueur(id: string): Promise<number> {
  const budget = (await getBudgetsDeplacement()).find((b) => b.id === id);
  if (!budget) throw new Error("Budget introuvable");
  const toImpute = budget.lignes.filter((l) => l.impute_joueur);
  for (const l of toImpute) {
    await createJoueurDepense({
      joueur_id: budget.joueur_id,
      date_depense: new Date().toISOString().split("T")[0]!,
      categorie:
        l.categorie === "billet_avion_joueur" || l.categorie === "billet_avion_coach"
          ? "billet_avion"
          : l.categorie === "hotel_joueur" || l.categorie === "hotel_coach"
            ? "hebergement"
            : l.categorie === "restauration"
              ? "restauration"
              : l.categorie === "materiel"
                ? "materiel"
                : "autre",
      libelle: `[Budget déplacement] ${l.description}`,
      montant: l.montant_total,
      devise: l.devise,
      reference_type: "budget_deplacement",
      reference_id: id,
    });
  }
  await logHistorique({
    action: "imputation",
    module: "budget_deplacement",
    entite_id: id,
    entite_label: budget.tournoi,
    ancienne_valeur: null,
    nouvelle_valeur: `${toImpute.length} ligne(s) imputée(s)`,
    commentaire: budget.destination,
  });
  return toImpute.length;
}
