import { seedBudgetJoueursAlloue } from "@/lib/data/mock/seed-budget";
import { getBilletsAvion } from "@/lib/data/billets";
import { getFacturesRestauration } from "@/lib/data/restauration";
import { getJoueurs } from "@/lib/data/joueurs";
import { getStagesProgramme } from "@/lib/data/stages";
import { getDepensesEntraineur } from "@/lib/data/entraineurs";
import { getSupabaseDataClient } from "@/lib/supabase/data-client";
import type { BudgetDashboard, BudgetJoueurResume, BudgetStageResume } from "@/lib/types/budget";

async function getJoueurDepensesAll() {
  const supabase = await getSupabaseDataClient();
  const { data, error } = await supabase.from("joueur_depenses").select("*");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function computeBudgetDashboard(annee: number): Promise<BudgetDashboard> {
  const supabase = await getSupabaseDataClient();
  const { data: budgetRows, error } = await supabase
    .from("budget_annuel")
    .select("*")
    .eq("annee", annee);
  if (error) throw new Error(error.message);
  const lignes_annuelles = budgetRows ?? [];

  const [joueurs, stages, depensesJoueurs, depensesEntraineurs, billets, factures] =
    await Promise.all([
      getJoueurs(),
      getStagesProgramme(),
      getJoueurDepensesAll(),
      getDepensesEntraineur(),
      getBilletsAvion(),
      getFacturesRestauration(),
    ]);

  const par_joueur: BudgetJoueurResume[] = joueurs.map((j) => {
    const depenses_reelles = depensesJoueurs
      .filter((d) => d.joueur_id === j.id)
      .reduce((s, d) => s + Number(d.montant), 0);
    const budget_alloue = seedBudgetJoueursAlloue[j.id] ?? 12000;
    return {
      joueur_id: j.id,
      joueur_nom: `${j.prenom} ${j.nom}`,
      categorie_age: j.categorie_age,
      budget_alloue,
      depenses_reelles,
      ecart: budget_alloue - depenses_reelles,
      taux_utilisation_pct:
        budget_alloue > 0 ? Math.round((depenses_reelles / budget_alloue) * 100) : 0,
    };
  });

  const par_stage: BudgetStageResume[] = stages
    .filter((s) => s.date_debut.startsWith(String(annee)))
    .map((s) => ({
      stage_id: s.id,
      stage_libelle: s.stage_action,
      categorie: s.categorie,
      date_debut: s.date_debut,
      budget_prevu: s.budget_prevu ?? 0,
      budget_reel: s.budget_reel ?? 0,
      ecart: (s.budget_prevu ?? 0) - (s.budget_reel ?? 0),
    }));

  const billetsPayes = billets
    .filter((b) => b.prix_billet && b.statut !== "refusee")
    .reduce((s, b) => s + (b.prix_billet ?? 0), 0);
  const facturesPayees = factures
    .filter((f) => f.statut === "payee")
    .reduce((s, f) => s + f.montant_ttc, 0);
  const depensesEntraineursTotal = depensesEntraineurs.reduce((s, d) => s + d.montant, 0);

  const lignes = lignes_annuelles as import("@/lib/types/budget").BudgetAnnuelLigne[];
  const synced = lignes.map((l) => {
    if (l.categorie === "voyages") {
      return { ...l, montant_reel: billetsPayes + depensesEntraineursTotal };
    }
    if (l.categorie === "restauration") {
      return { ...l, montant_reel: facturesPayees };
    }
    if (l.categorie === "stages") {
      const stagesReel = par_stage.reduce((s, x) => s + x.budget_reel, 0);
      return { ...l, montant_reel: stagesReel || l.montant_reel };
    }
    return l;
  });

  const total_alloue = synced
    .filter((l) => l.categorie !== "total")
    .reduce((s, l) => s + l.montant_alloue, 0);
  const total_reel = synced
    .filter((l) => l.categorie !== "total")
    .reduce((s, l) => s + l.montant_reel, 0);
  const total_engage = synced
    .filter((l) => l.categorie !== "total")
    .reduce((s, l) => s + l.montant_engage, 0);

  return {
    annee,
    lignes_annuelles: synced,
    total_alloue,
    total_reel,
    total_engage,
    par_joueur,
    par_stage,
  };
}
