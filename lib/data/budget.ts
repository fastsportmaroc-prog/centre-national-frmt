import { getSupabaseDataClient } from "@/lib/supabase/data-client";
import { BUDGET_ANNEE_DEFAUT } from "@/lib/constants/budget";
import type {
  BudgetAnnuelLigne,
  BudgetAnnuelLigneInput,
  BudgetDashboard,
} from "@/lib/types/budget";
import { computeBudgetDashboard } from "@/lib/utils/budget";

export async function getBudgetAnnuel(annee = BUDGET_ANNEE_DEFAUT): Promise<BudgetAnnuelLigne[]> {
  const supabase = await getSupabaseDataClient();
  const { data, error } = await supabase
    .from("budget_annuel")
    .select("*")
    .eq("annee", annee)
    .order("categorie");
  if (error) throw new Error(error.message);
  return (data ?? []) as BudgetAnnuelLigne[];
}

export async function updateBudgetAnnuelLigne(
  id: string,
  input: Partial<BudgetAnnuelLigneInput>
): Promise<BudgetAnnuelLigne> {
  const supabase = await getSupabaseDataClient();
  const { data, error } = await supabase
    .from("budget_annuel")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as BudgetAnnuelLigne;
}

export async function getBudgetDashboard(annee = BUDGET_ANNEE_DEFAUT): Promise<BudgetDashboard> {
  return computeBudgetDashboard(annee);
}
