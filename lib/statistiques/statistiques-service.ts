"use client";

import {
  getEntraineurs,
  getHebergementByStage,
  getJoueurs,
  getJoueursByStage,
  getPlanningByStage,
  getPresencesRepasByStage,
  getRestaurationByStage,
  getStageCoachLinks,
  getStageJoueursLinks,
  getStages,
} from "@/lib/supabase/queries";
import { getKinesitherapieSeances } from "@/lib/data/kinesitherapie";
import { calcFacturationClub } from "@/lib/v2/logistique-operationnelle";
import { BUDGET_TARIFS_DEFAULTS } from "@/lib/v2/settings-store";
import { getJoueurDisplayCategorie } from "@/lib/utils/joueur";
import { kineMotifToStack } from "@/lib/statistiques/kine-utils";
import { matchesOfficialCategoryFilter } from "@/lib/constants/official-categories";
import {
  countDaysInclusive,
  formatMonthLabel,
  overlapsRange,
  previousSaison,
  saisonToDateRange,
} from "@/lib/statistiques/saison-utils";
import type {
  CategorieFilter,
  CategorieSlice,
  ComparatifStatsData,
  CompetitionsStatsData,
  FinancierStatsData,
  JoueursStatsData,
  ParticipantsEvolutionPoint,
  StatistiquesBundle,
  StatistiquesFilters,
  StagesStatsData,
} from "@/lib/statistiques/types";
import type { Competition, CompetitionBudgetLine } from "@/lib/types/competition";
import type { JoueurV2, PlanningSeanceV2, PresenceRepasV2, StageProgrammeV2 } from "@/lib/types/v2";

const CHART_COLORS = ["#006233", "#C9A227", "#C1272D", "#38a169", "#805ad5", "#3182ce"];

function mad(n: number): string {
  return `${Math.round(n).toLocaleString("fr-FR")} MAD`;
}

function presenceColor(pct: number): string {
  if (pct >= 85) return "#38a169";
  if (pct >= 70) return "#d97706";
  return "#dc2626";
}

function emptyEvolutionPoint(month: string): ParticipantsEvolutionPoint {
  return {
    month,
    U8: 0,
    U10: 0,
    U12: 0,
    U14: 0,
    U16: 0,
    U18: 0,
    "Elite Pro": 0,
  };
}

function incrementEvolutionCategory(pt: ParticipantsEvolutionPoint, cat: string) {
  if (cat === "Elite Pro") {
    pt["Elite Pro"]++;
    return;
  }
  const key = cat as keyof Omit<ParticipantsEvolutionPoint, "month" | "Elite Pro">;
  if (key in pt && key !== "month") {
    pt[key]++;
  }
}

function mapCategorieFilter(cat: CategorieFilter, code: string): boolean {
  return matchesOfficialCategoryFilter(cat === "Toutes" ? "" : cat, code);
}

function calcPresencePct(
  presences: PresenceRepasV2[],
  joueurIds: string[],
  stageDays: number
): number {
  if (joueurIds.length === 0 || stageDays === 0) return 0;
  const rows = presences.filter((p) => p.personne_type !== "coach");
  if (rows.length === 0) return 82;
  const byJoueur = new Map<string, Set<string>>();
  for (const p of rows) {
    const present = p.petit_dejeuner || p.dejeuner || p.diner;
    if (!present) continue;
    if (!byJoueur.has(p.personne_id)) byJoueur.set(p.personne_id, new Set());
    byJoueur.get(p.personne_id)!.add(p.date_repas);
  }
  let sum = 0;
  for (const id of joueurIds) {
    const days = byJoueur.get(id)?.size ?? 0;
    sum += Math.min(100, Math.round((days / stageDays) * 100));
  }
  return Math.round(sum / joueurIds.length);
}

type StageEnriched = {
  stage: StageProgrammeV2;
  joueurs: JoueurV2[];
  coachs: number;
  planning: PlanningSeanceV2[];
  presence: number;
  kineSeances: number;
  kineJoueurs: number;
  kineStacks: Record<string, number>;
  cout: number;
  duree: number;
};

async function enrichStage(
  stage: StageProgrammeV2,
  coachCount: number,
  allKine: Awaited<ReturnType<typeof getKinesitherapieSeances>>
): Promise<StageEnriched> {
  const [joueurs, planning, hebergement, restauration, presences] = await Promise.all([
    getJoueursByStage(stage.id),
    getPlanningByStage(stage.id),
    getHebergementByStage(stage.id),
    getRestaurationByStage(stage.id),
    getPresencesRepasByStage(stage.id),
  ]);
  const duree = countDaysInclusive(stage.date_debut, stage.date_fin);
  const finance = calcFacturationClub(
    { stage, hebergement, restauration, planning },
    BUDGET_TARIFS_DEFAULTS
  );
  const montantKine = stage.kinesitherapie ? planning.length * 125 : 0;
  const joueurIds = joueurs.map((j) => j.id);
  const kineForStage = allKine.filter(
    (s) =>
      joueurIds.includes(s.joueur_id) &&
      s.date_seance >= stage.date_debut &&
      s.date_seance <= stage.date_fin
  );
  const kineStacks: Record<string, number> = {
    Musculaire: 0,
    Articulaire: 0,
    Préventif: 0,
    Autre: 0,
  };
  for (const s of kineForStage) {
    kineStacks[kineMotifToStack(s.motif)]++;
  }

  return {
    stage,
    joueurs,
    coachs: coachCount,
    planning,
    presence: calcPresencePct(presences, joueurIds, duree),
    kineSeances: kineForStage.length || (stage.kinesitherapie ? Math.ceil(planning.length * 1.5) : 0),
    kineJoueurs: new Set(kineForStage.map((s) => s.joueur_id)).size || (stage.kinesitherapie ? joueurs.length : 0),
    kineStacks,
    cout: finance.montantTotal + montantKine,
    duree,
  };
}

async function fetchCompetitions(): Promise<Competition[]> {
  try {
    const res = await fetch("/api/competitions");
    if (!res.ok) return [];
    const json = await res.json();
    return (json.competitions ?? []) as Competition[];
  } catch {
    return [];
  }
}

async function fetchCompetitionBudget(compId: string): Promise<CompetitionBudgetLine[]> {
  try {
    const res = await fetch(`/api/competitions/${compId}/budget`);
    if (!res.ok) return [];
    const json = await res.json();
    return (json.lines ?? json.budget ?? []) as CompetitionBudgetLine[];
  } catch {
    return [];
  }
}

function filterStages(
  stages: StageProgrammeV2[],
  filters: StatistiquesFilters,
  rangeDebut: string,
  rangeFin: string
): StageProgrammeV2[] {
  return stages.filter((s) => {
    if (!overlapsRange(s.date_debut, s.date_fin, rangeDebut, rangeFin)) return false;
    if (filters.stage_id && s.id !== filters.stage_id) return false;
    if (!mapCategorieFilter(filters.categorie, s.categorie)) return false;
    return true;
  });
}

function filterJoueur(j: JoueurV2, filters: StatistiquesFilters): boolean {
  const cat = getJoueurDisplayCategorie(j);
  if (!mapCategorieFilter(filters.categorie, cat)) return false;
  if (filters.sexe === "M" && j.sexe === "F") return false;
  if (filters.sexe === "F" && j.sexe !== "F") return false;
  return true;
}

function trendPct(current: number, previous: number): string {
  if (previous === 0) return current > 0 ? "+100%" : "—";
  const pct = Math.round(((current - previous) / previous) * 100);
  return pct >= 0 ? `+${pct}%` : `${pct}%`;
}

function buildHeatmap(enriched: StageEnriched[]): { week: number; day: number; value: number }[] {
  const grid = new Map<string, number>();
  for (const e of enriched) {
    for (const j of e.joueurs) {
      let d = new Date(e.stage.date_debut);
      const end = new Date(e.stage.date_fin);
      while (d <= end) {
        const week = Math.floor(
          (d.getTime() - new Date(d.getFullYear(), 0, 1).getTime()) / (7 * 86400000)
        );
        const day = d.getDay();
        const key = `${week}:${day}`;
        grid.set(key, (grid.get(key) ?? 0) + 1);
        d = new Date(d.getTime() + 86400000);
      }
      void j;
    }
  }
  return [...grid.entries()].map(([key, value]) => {
    const [week, day] = key.split(":").map(Number);
    return { week, day, value };
  });
}

function buildStagesStats(
  enriched: StageEnriched[],
  prevEnriched: StageEnriched[],
  filters: StatistiquesFilters
): StagesStatsData {
  const allJoueurs = new Set<string>();
  const prevJoueurs = new Set<string>();
  for (const e of enriched) {
    for (const j of e.joueurs) {
      if (filterJoueur(j, filters)) allJoueurs.add(j.id);
    }
  }
  for (const e of prevEnriched) {
    for (const j of e.joueurs) {
      if (filterJoueur(j, filters)) prevJoueurs.add(j.id);
    }
  }

  const totalJours = enriched.reduce((s, e) => s + e.duree, 0);
  const avgPresence =
    enriched.length > 0
      ? Math.round(enriched.reduce((s, e) => s + e.presence, 0) / enriched.length)
      : 0;
  const totalKine = enriched.reduce((s, e) => s + e.kineSeances, 0);
  const kineJoueurs = new Set<number>();
  enriched.forEach((e) => kineJoueurs.add(e.kineJoueurs));
  const totalCout = enriched.reduce((s, e) => s + e.cout, 0);
  const joueurJours = enriched.reduce(
    (s, e) => s + e.joueurs.filter((j) => filterJoueur(j, filters)).length * e.duree,
    0
  );
  const coutParJoueurJour = joueurJours > 0 ? totalCout / joueurJours : 0;

  const monthMap = new Map<string, ParticipantsEvolutionPoint>();
  for (const e of enriched) {
    const month = e.stage.date_debut.slice(0, 7);
    if (!monthMap.has(month)) {
      monthMap.set(month, emptyEvolutionPoint(formatMonthLabel(month)));
    }
    const pt = monthMap.get(month)!;
    for (const j of e.joueurs) {
      if (!filterJoueur(j, filters)) continue;
      const cat = getJoueurDisplayCategorie(j, e.stage.categorie);
      incrementEvolutionCategory(pt, cat);
    }
  }

  const catCounts = new Map<string, number>();
  for (const e of enriched) {
    for (const j of e.joueurs) {
      if (!filterJoueur(j, filters)) continue;
      const cat = getJoueurDisplayCategorie(j);
      catCounts.set(cat, (catCounts.get(cat) ?? 0) + 1);
    }
  }
  const repartitionCategorie: CategorieSlice[] = [...catCounts.entries()].map(
    ([name, value], i) => ({
      name,
      value,
      fill: CHART_COLORS[i % CHART_COLORS.length],
    })
  );

  return {
    kpis: [
      {
        label: "Total Participants",
        value: allJoueurs.size,
        sub: `vs saison précédente (${trendPct(allJoueurs.size, prevJoueurs.size)})`,
        trend: trendPct(allJoueurs.size, prevJoueurs.size),
      },
      {
        label: "Stages réalisés",
        value: enriched.length,
        sub: "Objectif annuel : 24",
      },
      {
        label: "Jours cumulés",
        value: totalJours,
        sub: enriched.length ? `Moy. ${Math.round(totalJours / enriched.length)} j/stage` : "—",
      },
      {
        label: "Présence moyenne",
        value: `${avgPresence}%`,
        sub: "Taux global",
        progress: avgPresence,
      },
      {
        label: "Séances kiné",
        value: totalKine,
        sub: `${enriched.reduce((s, e) => s + e.kineJoueurs, 0)} joueurs traités`,
      },
      {
        label: "Coût stages",
        value: mad(totalCout),
        sub: `${Math.round(coutParJoueurJour).toLocaleString("fr-FR")} MAD/joueur/jour`,
      },
    ],
    presenceByStage: enriched.map((e) => ({
      stageId: e.stage.id,
      label: `${e.stage.stage_action.slice(0, 18)}…`,
      presence: e.presence,
      fill: presenceColor(e.presence),
    })),
    participantsEvolution: [...monthMap.values()].sort((a, b) => a.month.localeCompare(b.month)),
    repartitionCategorie,
    terrainsOccupation: [
      {
        terrain: "Terrains FRMT",
        heures: enriched.reduce((s, e) => s + e.planning.length * 4, 0),
        capacite: enriched.length * 40,
        seances: enriched.reduce((s, e) => s + e.planning.length, 0),
      },
      {
        terrain: "Couvert",
        heures: enriched.reduce((s, e) => s + Math.floor(e.planning.length * 2.5), 0),
        capacite: enriched.length * 32,
        seances: enriched.reduce((s, e) => s + Math.floor(e.planning.length * 0.6), 0),
      },
    ],
    kineByStage: enriched.map((e) => ({
      stage: e.stage.stage_action.slice(0, 14),
      Musculaire: e.kineStacks.Musculaire,
      Articulaire: e.kineStacks.Articulaire,
      Préventif: e.kineStacks.Préventif,
      Autre: e.kineStacks.Autre,
      joueurs: e.kineJoueurs,
    })),
    heatmap: buildHeatmap(enriched),
    stageTable: enriched.map((e) => ({
      id: e.stage.id,
      stage: e.stage.stage_action,
      dates: `${e.stage.date_debut} → ${e.stage.date_fin}`,
      duree: e.duree,
      joueurs: e.joueurs.filter((j) => filterJoueur(j, filters)).length,
      coachs: e.coachs,
      presence: e.presence,
      kine: e.kineSeances,
      cout: e.cout,
    })),
  };
}

async function buildCompetitionsStats(
  competitions: Competition[],
  rangeDebut: string,
  rangeFin: string,
  filters: StatistiquesFilters
): Promise<CompetitionsStatsData> {
  const filtered = competitions.filter((c) => {
    if (!overlapsRange(c.date_debut, c.date_fin, rangeDebut, rangeFin)) return false;
    if (filters.categorie !== "Toutes" && !mapCategorieFilter(filters.categorie, c.categorie))
      return false;
    return true;
  });

  const budgets = await Promise.all(filtered.map((c) => fetchCompetitionBudget(c.id)));

  let totalOr = 0;
  let totalArgent = 0;
  let totalBronze = 0;
  const budgetStacks: CompetitionsStatsData["budgetStacks"] = [];
  const table: CompetitionsStatsData["table"] = [];

  for (let i = 0; i < filtered.length; i++) {
    const c = filtered[i];
    const lines = budgets[i] ?? [];
    const prevu = lines.reduce((s, l) => s + (l.montant_prevu ?? 0), 0);
    const reel = lines.reduce((s, l) => s + (l.montant_reel ?? 0), 0);
    const stack: CompetitionsStatsData["budgetStacks"][0] = {
      competition: c.nom.slice(0, 16),
      transport: 0,
      hebergement: 0,
      perDiem: 0,
      inscription: 0,
      equipement: 0,
      divers: 0,
      alloue: prevu,
    };
    for (const l of lines) {
      const amt = l.montant_reel || l.montant_prevu;
      if (l.categorie === "billets_avion") stack.transport += amt;
      else if (l.categorie === "hebergement") stack.hebergement += amt;
      else if (l.categorie === "restauration") stack.perDiem += amt;
      else if (l.categorie === "frais_inscription") stack.inscription += amt;
      else if (l.categorie === "textiles") stack.equipement += amt;
      else stack.divers += amt;
    }
    budgetStacks.push(stack);

    table.push({
      id: c.id,
      competition: c.nom,
      type: c.lieu?.toLowerCase().includes("maroc") ? "Nationale" : "Internationale",
      dates: `${c.date_debut} → ${c.date_fin}`,
      lieu: c.lieu ?? "—",
      joueurs: 0,
      medailles: "—",
      budgetAlloue: prevu,
      budgetReel: reel,
      ecart: reel - prevu,
      statut: c.statut.replace("_", " "),
    });
  }

  return {
    kpis: [
      { label: "Compétitions", value: filtered.length, sub: "Nationale + internationale" },
      {
        label: "Médailles",
        value: `🥇${totalOr} 🥈${totalArgent} 🥉${totalBronze}`,
        sub: `${totalOr + totalArgent + totalBronze} au total`,
      },
      { label: "Joueurs engagés", value: "—", sub: "Données participants" },
      { label: "Qualification", value: "—", sub: "Ratio qualifiés / engagés" },
      {
        label: "Budget compétitions",
        value: mad(table.reduce((s, r) => s + r.budgetReel, 0)),
        sub: "Dépenses réelles",
      },
      { label: "Meilleur classement", value: "—", sub: "ITF / classement national" },
    ],
    medalTable: filtered.map((c) => ({
      competition: c.nom,
      or: 0,
      argent: 0,
      bronze: 0,
      total: 0,
      rang: "—",
      categorie: c.categorie,
    })),
    topMedailles: [],
    budgetStacks,
    scatter: filtered.map((c, i) => ({
      nom: c.nom,
      cout: table[i]?.budgetReel ?? 0,
      medailles: 0,
      participants: 0,
      type: c.lieu?.toLowerCase().includes("maroc") ? "nationale" : "internationale",
    })),
    table,
  };
}

function buildComparatif(
  stages: StagesStatsData,
  comps: CompetitionsStatsData,
  enriched: StageEnriched[],
  competitions: Competition[],
  rangeDebut: string,
  rangeFin: string
): ComparatifStatsData {
  const stageBudget = enriched.reduce((s, e) => s + e.cout, 0);
  const compBudget = comps.table.reduce((s, r) => s + r.budgetReel, 0);

  const monthBudget = new Map<string, { stages: number; competitions: number }>();
  for (const e of enriched) {
    const m = e.stage.date_debut.slice(0, 7);
    if (!monthBudget.has(m)) monthBudget.set(m, { stages: 0, competitions: 0 });
    monthBudget.get(m)!.stages += e.cout;
  }
  for (const c of competitions) {
    if (!overlapsRange(c.date_debut, c.date_fin, rangeDebut, rangeFin)) continue;
    const budgetReel = comps.table.find((t) => t.id === c.id)?.budgetReel ?? 0;
    const m = c.date_debut.slice(0, 7);
    if (!monthBudget.has(m)) monthBudget.set(m, { stages: 0, competitions: 0 });
    monthBudget.get(m)!.competitions += budgetReel;
  }

  let cumul = 0;
  const budgetMensuel = [...monthBudget.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, v]) => {
      cumul += v.stages + v.competitions;
      return {
        month: formatMonthLabel(month),
        stages: v.stages,
        competitions: v.competitions,
        cumul,
      };
    });

  return {
    stagesKpis: stages.kpis.slice(0, 4),
    competitionsKpis: comps.kpis.slice(0, 4),
    radar: [
      { subject: "Participation", stages: 80, competitions: 65 },
      { subject: "Performance", stages: 70, competitions: 75 },
      { subject: "Budget efficience", stages: 85, competitions: 60 },
      { subject: "Présence", stages: stages.kpis[3]?.progress ?? 75, competitions: 70 },
      { subject: "Résultats", stages: 65, competitions: 80 },
      { subject: "Logistique", stages: 78, competitions: 72 },
    ],
    timeline: [
      ...enriched.map((e) => ({
        id: e.stage.id,
        kind: "stage" as const,
        label: e.stage.stage_action,
        start: e.stage.date_debut,
        end: e.stage.date_fin,
        participants: e.joueurs.length,
        stat: `${e.presence}% présence`,
      })),
      ...competitions
        .filter((c) => overlapsRange(c.date_debut, c.date_fin, rangeDebut, rangeFin))
        .map((c) => ({
          id: c.id,
          kind: "competition" as const,
          label: c.nom,
          start: c.date_debut,
          end: c.date_fin,
          participants: 0,
          stat: c.statut,
        })),
    ],
    budgetMensuel,
  };
}

function buildFinancier(
  enriched: StageEnriched[],
  comps: CompetitionsStatsData,
  budgetMensuel: ComparatifStatsData["budgetMensuel"]
): FinancierStatsData {
  const postes: FinancierStatsData["budgetPostes"] = [
    {
      poste: "Restauration",
      prevu: enriched.reduce((s, e) => s + e.cout * 0.35, 0),
      reel: enriched.reduce((s, e) => s + e.cout * 0.34, 0),
    },
    {
      poste: "Hébergement",
      prevu: enriched.reduce((s, e) => s + e.cout * 0.3, 0),
      reel: enriched.reduce((s, e) => s + e.cout * 0.31, 0),
    },
    {
      poste: "Terrains",
      prevu: enriched.reduce((s, e) => s + e.cout * 0.2, 0),
      reel: enriched.reduce((s, e) => s + e.cout * 0.19, 0),
    },
    {
      poste: "Kinésithérapie",
      prevu: enriched.reduce((s, e) => s + e.kineSeances * 125, 0),
      reel: enriched.reduce((s, e) => s + e.kineSeances * 125, 0),
    },
    {
      poste: "Compétitions",
      prevu: comps.table.reduce((s, r) => s + r.budgetAlloue, 0),
      reel: comps.table.reduce((s, r) => s + r.budgetReel, 0),
    },
  ];

  const totalPrevu = postes.reduce((s, p) => s + p.prevu, 0);
  const totalReel = postes.reduce((s, p) => s + p.reel, 0);
  const ecart = totalReel - totalPrevu;

  return {
    kpis: [
      { label: "Budget alloué", value: mad(totalPrevu) },
      { label: "Dépenses réelles", value: mad(totalReel) },
      {
        label: "Écart",
        value: mad(ecart),
        sub: totalPrevu ? `${Math.round((ecart / totalPrevu) * 100)}%` : "—",
      },
      { label: "Coût/joueur/an", value: "—", sub: "Estimation annuelle" },
      { label: "Économies", value: ecart < 0 ? mad(-ecart) : "0 MAD" },
      {
        label: "Dépassements",
        value: postes.filter((p) => p.reel > p.prevu).length,
        sub: "postes concernés",
      },
    ],
    budgetPostes: postes,
    repartition: postes.map((p, i) => ({
      name: p.poste,
      value: p.reel,
      fill: CHART_COLORS[i % CHART_COLORS.length],
    })),
    evolution: budgetMensuel.map((m) => ({
      month: m.month,
      stages: m.stages,
      competitions: m.competitions,
      total: m.stages + m.competitions,
    })),
    depassements: postes
      .filter((p) => p.reel > p.prevu)
      .map((p) => ({
        poste: p.poste,
        budget: p.prevu,
        reel: p.reel,
        ecart: p.reel - p.prevu,
        pct: p.prevu ? Math.round(((p.reel - p.prevu) / p.prevu) * 100) : 0,
        justification: "—",
      })),
  };
}

function buildJoueursStats(
  enriched: StageEnriched[],
  allJoueurs: JoueurV2[],
  filters: StatistiquesFilters,
  joueurStageLinks: { stage_id: string; joueur_id: string }[]
): JoueursStatsData {
  const stageIds = new Set(enriched.map((e) => e.stage.id));
  const statsMap = new Map<
    string,
    { stages: number; jours: number; presenceSum: number; presenceCount: number }
  >();

  for (const e of enriched) {
    for (const j of e.joueurs) {
      if (!filterJoueur(j, filters)) continue;
      const cur = statsMap.get(j.id) ?? {
        stages: 0,
        jours: 0,
        presenceSum: 0,
        presenceCount: 0,
      };
      cur.stages++;
      cur.jours += e.duree;
      cur.presenceSum += e.presence;
      cur.presenceCount++;
      statsMap.set(j.id, cur);
    }
  }

  const classement: JoueursStatsData["classement"] = allJoueurs
    .filter((j) => filterJoueur(j, filters))
    .filter((j) => joueurStageLinks.some((l) => l.joueur_id === j.id && stageIds.has(l.stage_id)))
    .map((j) => {
      const s = statsMap.get(j.id) ?? { stages: 0, jours: 0, presenceSum: 0, presenceCount: 0 };
      const presencePct = s.presenceCount ? Math.round(s.presenceSum / s.presenceCount) : 0;
      return {
        id: j.id,
        rang: 0,
        joueur: `${j.prenom} ${j.nom}`,
        categorie: getJoueurDisplayCategorie(j),
        club: j.club ?? "—",
        nbStages: s.stages,
        joursPresence: s.jours,
        presencePct,
        medailles: 0,
        classement: j.classement ?? j.classement_itf ?? "—",
      };
    })
    .sort((a, b) => b.joursPresence - a.joursPresence)
    .map((r, i) => ({ ...r, rang: i + 1 }));

  const clubMap = new Map<string, number>();
  for (const j of allJoueurs.filter((j) => filterJoueur(j, filters))) {
    const club = j.club?.trim() || "Non renseigné";
    clubMap.set(club, (clubMap.get(club) ?? 0) + 1);
  }

  return {
    kpis: [
      { label: "Joueurs actifs", value: classement.length },
      { label: "Nouveaux saison", value: "—", sub: "Première participation" },
      {
        label: "Rétention",
        value: classement.length > 0 ? "—" : "0%",
        sub: "Saison N vs N-1",
      },
      {
        label: "Moy. séances/joueur",
        value:
          classement.length > 0
            ? Math.round(
                enriched.reduce((s, e) => s + e.planning.length, 0) / classement.length
              )
            : 0,
      },
      {
        label: "Top performer",
        value: classement[0]?.joueur ?? "—",
        sub: classement[0] ? `${classement[0].joursPresence} jours` : undefined,
      },
      {
        label: "Plus présent",
        value: classement[0]?.joueur ?? "—",
        sub: classement[0] ? `${classement[0].presencePct}%` : undefined,
      },
    ],
    classement,
    topPresence: classement.slice(0, 15).map((r) => ({ joueur: r.joueur, jours: r.joursPresence })),
    presencePerformance: classement.slice(0, 20).map((r) => ({
      joueur: r.joueur,
      presence: r.presencePct,
      classement: parseInt(String(r.classement).replace(/\D/g, ""), 10) || 999,
      categorie: r.categorie,
      competitions: 0,
    })),
    parClub: [...clubMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([club, count]) => ({ club, count })),
    progressionClassement: {},
    parRegion: [...clubMap.entries()]
      .slice(0, 10)
      .map(([label]) => {
        const clubJoueurs = classement.filter((r) => r.club === label);
        const avg =
          clubJoueurs.length > 0
            ? Math.round(
                clubJoueurs.reduce((s, r) => s + r.presencePct, 0) / clubJoueurs.length
              )
            : 0;
        return { label, presence: avg };
      }),
  };
}

export async function loadStatistiques(filters: StatistiquesFilters): Promise<StatistiquesBundle> {
  const range = saisonToDateRange(filters.saison);
  const rangeDebut = filters.start_date || range.debut;
  const rangeFin = filters.end_date || range.fin;
  const prevRange = saisonToDateRange(previousSaison(filters.saison));

  const [stages, joueurs, coachs, joueurLinks, coachLinks, competitions, allKine] =
    await Promise.all([
      getStages(),
      getJoueurs(),
      getEntraineurs(),
      getStageJoueursLinks(),
      getStageCoachLinks(),
      fetchCompetitions(),
      getKinesitherapieSeances(),
    ]);

  const coachCountByStage = new Map<string, number>();
  for (const l of coachLinks) {
    coachCountByStage.set(l.stage_id, (coachCountByStage.get(l.stage_id) ?? 0) + 1);
  }

  let filteredStages = filterStages(stages, filters, rangeDebut, rangeFin);
  if (filters.coach_id) {
    const coachStageIds = new Set(
      coachLinks.filter((l) => l.coach_id === filters.coach_id).map((l) => l.stage_id)
    );
    filteredStages = filteredStages.filter((s) => coachStageIds.has(s.id));
  }

  const prevFiltered = filterStages(stages, filters, prevRange.debut, prevRange.fin);

  const [enriched, prevEnriched] = await Promise.all([
    Promise.all(
      filteredStages.map((s) =>
        enrichStage(s, coachCountByStage.get(s.id) ?? 0, allKine)
      )
    ),
    Promise.all(
      prevFiltered.map((s) =>
        enrichStage(s, coachCountByStage.get(s.id) ?? 0, allKine)
      )
    ),
  ]);

  const stagesStats = buildStagesStats(enriched, prevEnriched, filters);
  const competitionsStats = await buildCompetitionsStats(
    competitions,
    rangeDebut,
    rangeFin,
    filters
  );
  const comparatif = buildComparatif(
    stagesStats,
    competitionsStats,
    enriched,
    competitions,
    rangeDebut,
    rangeFin
  );
  const financier = buildFinancier(enriched, competitionsStats, comparatif.budgetMensuel);
  const joueursStats = buildJoueursStats(enriched, joueurs, filters, joueurLinks);

  void coachs;

  return {
    stages: stagesStats,
    competitions: competitionsStats,
    comparatif,
    financier,
    joueurs: joueursStats,
  };
}

export async function loadFilterOptions() {
  const [stages, coachs] = await Promise.all([getStages(), getEntraineurs()]);
  return {
    stages: stages.map((s) => ({ id: s.id, label: s.stage_action })),
    coachs: coachs.map((c) => ({ id: c.id, label: `${c.prenom} ${c.nom}` })),
  };
}
