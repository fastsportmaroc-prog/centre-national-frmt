import "server-only";

import { matchesEntityCategory } from "@/lib/auth/player-category-context";
import type { ServerPlayerCategoryContext } from "@/lib/auth/player-category-context.server";
import { matchesJoueurCategoryFilter } from "@/lib/utils/joueur";
import type { ProgrammationEvenementEnriched } from "@/lib/types/programmation-joueurs";
import type { ProgrammationFilters } from "@/lib/types/programmation-joueurs";
import { sanitizeCategoryParam } from "@/lib/auth/player-category-context";
import type { StatistiquesFilters } from "@/lib/statistiques/types";
import type { FrmtClassementPlayer } from "@/lib/frmt/classement-to-joueurs";
import type { CompetitionDashboardSummary } from "@/lib/competitions/dashboard-summary";

export function enforceProgrammationFilters(
  filters: ProgrammationFilters,
  ctx: ServerPlayerCategoryContext
): ProgrammationFilters {
  if (!ctx.restricted) return filters;
  const enforced = sanitizeCategoryParam(filters.categorieJoueur, ctx);
  return { ...filters, categorieJoueur: enforced };
}

export function filterProgrammationEvenements(
  events: ProgrammationEvenementEnriched[],
  ctx: ServerPlayerCategoryContext
): ProgrammationEvenementEnriched[] {
  if (!ctx.restricted) return events;
  return events.filter((e) => {
    if (e.cne_column_id?.startsWith("coach-")) {
      return matchesEntityCategory(e.categorie_tournoi, ctx.allowedCategories, false);
    }
    const cat = e.joueur_categorie ?? e.categorie_tournoi ?? "";
    if (!cat) return false;
    return matchesEntityCategory(cat, ctx.allowedCategories, false);
  });
}

export function filterCompetitionsByCategory<
  T extends { categorie?: string | null },
>(items: T[], ctx: ServerPlayerCategoryContext): T[] {
  if (!ctx.restricted) return items;
  return items.filter((c) => matchesEntityCategory(c.categorie, ctx.allowedCategories, false));
}

/** Applique le filtre catégorie et recalcule KPI / alertes pour rester cohérent. */
export function filterCompetitionDashboardSummary(
  summary: CompetitionDashboardSummary,
  ctx: ServerPlayerCategoryContext
): CompetitionDashboardSummary {
  const competitions = filterCompetitionsByCategory(summary.competitions, ctx);
  const ids = new Set(competitions.map((c) => c.id));
  const visasUrgents = summary.visasUrgents.filter((r) => ids.has(r.competition_id));

  return {
    ...summary,
    competitions,
    visasUrgents,
    kpis: {
      actives: competitions.length,
      avec_visas: competitions.filter((c) => c.visas_requis).length,
      visas_a_prevoir: competitions.reduce((s, c) => s + c.visas_a_prevoir, 0),
      passeports_critiques: competitions.reduce((s, c) => s + c.passeports_alerte, 0),
      billets_en_attente: competitions.reduce((s, c) => s + c.billets_en_attente, 0),
      participants_total: competitions.reduce((s, c) => s + c.nb_participants, 0),
    },
  };
}

export function canAccessCompetitionCategory(
  categorie: string | null | undefined,
  ctx: ServerPlayerCategoryContext
): boolean {
  return matchesEntityCategory(categorie, ctx.allowedCategories, ctx.bypassFilter);
}

export function enforceStatistiquesFilters(
  filters: StatistiquesFilters,
  ctx: ServerPlayerCategoryContext
): StatistiquesFilters {
  if (!ctx.restricted) return filters;
  const enforced = sanitizeCategoryParam(filters.categorie, ctx);
  return {
    ...filters,
    categorie: (enforced ?? "Toutes") as StatistiquesFilters["categorie"],
  };
}

export function filterFrmtClassementPlayers(
  players: FrmtClassementPlayer[],
  ctx: ServerPlayerCategoryContext
): FrmtClassementPlayer[] {
  if (!ctx.restricted) return players;
  return players.filter((p) =>
    ctx.allowedCategories.some((key) =>
      matchesJoueurCategoryFilter(
        { date_naissance: `${p.annee_naissance}-01-01`, categorie_age: null },
        key
      )
    )
  );
}

export function filterStagesByCategory<
  T extends { categorie?: string | null },
>(stages: T[], ctx: ServerPlayerCategoryContext): T[] {
  if (!ctx.restricted) return stages;
  return stages.filter((s) => matchesEntityCategory(s.categorie, ctx.allowedCategories, false));
}
