import { getJoueurs, getEntraineurs, getStages } from "@/lib/supabase/queries";
import { fetchProgrammationEvenements } from "@/lib/programmation-joueurs/client-api";
import { loadDashboardCompetition } from "@/lib/v2/dashboard-competition-data";
import type { CompetitionDashboardSummary } from "@/lib/competitions/dashboard-summary";
import type { ProgrammationEvenementEnriched } from "@/lib/types/programmation-joueurs";
import type { EntraineurV2, JoueurV2, StageProgrammeV2 } from "@/lib/types/v2";
import { resolveEffectiveStageStatut } from "@/lib/v2/stage-effective-statut";
import type { DashboardPeriod } from "@/lib/v2/dashboard-period";
import { rangesOverlap } from "@/lib/v2/dashboard-period";
import type { DashboardRankingRow } from "@/app/api/dashboard/rankings/route";
import type { ClassementExterneRow } from "@/lib/types/classements-externes";
import type { OccupationSlot, OccupationPerson } from "@/app/api/dashboard/occupation/route";

export type CalendarEventKind = "stage" | "competition" | "programmation";

export type DashboardCalendarEvent = {
  id: string;
  kind: CalendarEventKind;
  titre: string;
  categorie: string | null;
  date_debut: string;
  date_fin: string;
  href: string;
};

export type DashboardDirectionData = {
  period: DashboardPeriod;
  kpis: {
    stages: number;
    competitions: number;
    joueurs: number;
    coachs: number;
    evenements: number;
    occupationPct: number;
  };
  calendarEvents: DashboardCalendarEvent[];
  stagesInPeriod: StageProgrammeV2[];
  occupation: { slots: OccupationSlot[]; persons: OccupationPerson[] };
  rankings: DashboardRankingRow[];
  classementsExternes: ClassementExterneRow[];
  programmation: ProgrammationEvenementEnriched[];
  competition: CompetitionDashboardSummary;
  joueurs: JoueurV2[];
  coaches: EntraineurV2[];
};

function stageEvents(stages: StageProgrammeV2[], period: DashboardPeriod): DashboardCalendarEvent[] {
  const today = new Date().toISOString().slice(0, 10);
  return stages
    .map((s) => ({ ...s, statut: resolveEffectiveStageStatut(s, today) }))
    .filter(
      (s) =>
        s.statut !== "annule" &&
        rangesOverlap(s.date_debut, s.date_fin, period.start, period.end)
    )
    .map((s) => ({
      id: `stage-${s.id}`,
      kind: "stage" as const,
      titre: s.stage_action,
      categorie: s.categorie ?? null,
      date_debut: s.date_debut.slice(0, 10),
      date_fin: s.date_fin.slice(0, 10),
      href: `/v2/stages/${s.id}`,
    }));
}

function competitionEvents(
  comp: CompetitionDashboardSummary,
  period: DashboardPeriod
): DashboardCalendarEvent[] {
  return comp.competitions
    .filter((c) => rangesOverlap(c.date_debut, c.date_fin, period.start, period.end))
    .map((c) => ({
      id: `comp-${c.id}`,
      kind: "competition" as const,
      titre: c.nom,
      categorie: c.categorie ?? null,
      date_debut: c.date_debut.slice(0, 10),
      date_fin: c.date_fin.slice(0, 10),
      href: `/competitions/${c.id}`,
    }));
}

function programmationEvents(
  events: ProgrammationEvenementEnriched[],
  period: DashboardPeriod
): DashboardCalendarEvent[] {
  return events
    .filter((e) => rangesOverlap(e.date_debut, e.date_fin, period.start, period.end))
    .map((e) => ({
      id: `prog-${e.id}`,
      kind: "programmation" as const,
      titre: e.nom || "Événement",
      categorie: e.joueur_categorie ?? null,
      date_debut: e.date_debut.slice(0, 10),
      date_fin: e.date_fin.slice(0, 10),
      href: "/v2/programmation-joueurs",
    }));
}

async function fetchOccupation(period: DashboardPeriod): Promise<DashboardDirectionData["occupation"]> {
  try {
    const res = await fetch(
      `/api/dashboard/occupation?dateDebut=${period.start}&dateFin=${period.end}`,
      { cache: "no-store" }
    );
    if (!res.ok) return { slots: [], persons: [] };
    const json = (await res.json()) as DashboardDirectionData["occupation"];
    return { slots: json.slots ?? [], persons: json.persons ?? [] };
  } catch {
    return { slots: [], persons: [] };
  }
}

async function fetchClassementsExternes(): Promise<ClassementExterneRow[]> {
  try {
    const res = await fetch("/api/dashboard/classements-externes", { cache: "no-store" });
    if (!res.ok) return [];
    const json = (await res.json()) as { rows?: ClassementExterneRow[] };
    return json.rows ?? [];
  } catch {
    return [];
  }
}

async function fetchRankings(): Promise<DashboardRankingRow[]> {
  try {
    const res = await fetch("/api/dashboard/rankings", { cache: "no-store" });
    if (!res.ok) return [];
    const json = (await res.json()) as { rows?: DashboardRankingRow[] };
    return json.rows ?? [];
  } catch {
    return [];
  }
}

/** Occupation en % : créneaux occupés / (courts actifs × jours × 2 créneaux). */
function occupationPercent(slots: OccupationSlot[], period: DashboardPeriod): number {
  if (!slots.length) return 0;
  const courts = new Set(slots.map((s) => s.infrastructure_id)).size || 1;
  const start = new Date(`${period.start}T00:00:00`);
  const end = new Date(`${period.end}T00:00:00`);
  const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1);
  const capacity = courts * days * 2; // matin + après-midi
  const used = slots.reduce((sum, s) => sum + (s.creneau === "journee" ? 2 : 1), 0);
  return Math.min(100, Math.round((used / capacity) * 100));
}

export async function loadDashboardDirection(
  period: DashboardPeriod
): Promise<DashboardDirectionData> {
  const [joueurs, coachs, stages, comp, progRes, occupation, rankings, classementsExternes] =
    await Promise.all([
    getJoueurs(),
    getEntraineurs(),
    getStages(),
    loadDashboardCompetition(),
    fetchProgrammationEvenements({ dateDebut: period.start, dateFin: period.end }),
    fetchOccupation(period),
    fetchRankings(),
    fetchClassementsExternes(),
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const stagesEv = stageEvents(stages, period);
  const stagesInPeriod = stages
    .map((s) => ({ ...s, statut: resolveEffectiveStageStatut(s, today) }))
    .filter(
      (s) =>
        s.statut !== "annule" &&
        rangesOverlap(s.date_debut, s.date_fin, period.start, period.end)
    );
  const compEv = competitionEvents(comp, period);
  const progEv = programmationEvents(progRes.evenements, period);
  const calendarEvents = [...stagesEv, ...compEv, ...progEv].sort((a, b) =>
    a.date_debut.localeCompare(b.date_debut)
  );

  const activeJoueurs = joueurs.filter((j) => (j.statut ?? "actif") === "actif");
  const activeCoachs = coachs.filter((c) => (c.statut ?? "actif") === "actif");

  return {
    period,
    kpis: {
      stages: stagesEv.length,
      competitions: compEv.length,
      joueurs: activeJoueurs.length,
      coachs: activeCoachs.length,
      evenements: progEv.length,
      occupationPct: occupationPercent(occupation.slots, period),
    },
    calendarEvents,
    stagesInPeriod,
    occupation,
    rankings,
    classementsExternes,
    programmation: progRes.evenements.filter((e) =>
      rangesOverlap(e.date_debut, e.date_fin, period.start, period.end)
    ),
    competition: comp,
    joueurs: activeJoueurs,
    coaches: activeCoachs,
  };
}
