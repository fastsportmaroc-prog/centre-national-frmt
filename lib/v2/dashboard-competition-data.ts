import type { CompetitionDashboardSummary } from "@/lib/competitions/dashboard-summary";

const EMPTY: CompetitionDashboardSummary = {
  competitions: [],
  kpis: {
    actives: 0,
    avec_visas: 0,
    visas_a_prevoir: 0,
    passeports_critiques: 0,
    billets_en_attente: 0,
    participants_total: 0,
  },
  visasUrgents: [],
};

export async function loadDashboardCompetition(): Promise<CompetitionDashboardSummary> {
  try {
    const res = await fetch("/api/dashboard/competitions", { cache: "no-store" });
    const json = (await res.json()) as CompetitionDashboardSummary & { error?: string };
    if (!res.ok) {
      return { ...EMPTY, error: json.error ?? "Impossible de charger les compétitions." };
    }
    return json;
  } catch {
    return { ...EMPTY, error: "Erreur réseau — tableau compétitions indisponible." };
  }
}
