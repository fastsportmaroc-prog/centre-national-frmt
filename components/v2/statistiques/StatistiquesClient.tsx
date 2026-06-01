"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { V2PageHeader } from "@/components/v2/V2PageHeader";
import { StatsFilterBar } from "@/components/v2/statistiques/StatsFilterBar";
import { StatsStagesView } from "@/components/v2/statistiques/tabs/StatsStagesView";
import { StatsCompetitionsView } from "@/components/v2/statistiques/tabs/StatsCompetitionsView";
import { StatsComparatifView } from "@/components/v2/statistiques/tabs/StatsComparatifView";
import { StatsFinancierView } from "@/components/v2/statistiques/tabs/StatsFinancierView";
import { StatsJoueursView } from "@/components/v2/statistiques/tabs/StatsJoueursView";
import { useToast } from "@/components/v2/ui/ToastProvider";
import { useStatistiquesFilters } from "@/lib/statistiques/hooks/useStatistiquesFilters";
import {
  loadFilterOptions,
  loadStatistiques,
} from "@/lib/statistiques/statistiques-service";
import type { StatistiquesBundle, StatistiquesTab } from "@/lib/statistiques/types";
import { exportCsv } from "@/lib/export/reports";
import { exportPdfReport } from "@/lib/export/reports";
import { cn } from "@/lib/utils/cn";

const TABS: { id: StatistiquesTab; label: string }[] = [
  { id: "stages", label: "Stages" },
  { id: "competitions", label: "Compétitions" },
  { id: "comparatif", label: "Comparatif" },
  { id: "financier", label: "Financier" },
  { id: "joueurs", label: "Joueurs" },
];

function StatistiquesContent() {
  const { toast } = useToast();
  const { filters, setFilter, resetFilters } = useStatistiquesFilters();
  const [data, setData] = useState<StatistiquesBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [options, setOptions] = useState<{
    stages: { id: string; label: string }[];
    coachs: { id: string; label: string }[];
  }>({ stages: [], coachs: [] });

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const bundle = await loadStatistiques(filters);
      setData(bundle);
    } catch {
      toast("Erreur chargement statistiques", "error");
    } finally {
      setLoading(false);
    }
  }, [filters, toast]);

  useEffect(() => {
    void loadFilterOptions().then(setOptions);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  function handleExportCsv() {
    if (!data) return;
    const tab = filters.tab;
    if (tab === "stages") {
      exportCsv(
        "statistiques-stages.csv",
        ["Stage", "Dates", "Joueurs", "Présence", "Coût"],
        data.stages.stageTable.map((r) => [
          r.stage,
          r.dates,
          String(r.joueurs),
          `${r.presence}%`,
          String(r.cout),
        ])
      );
    } else if (tab === "joueurs") {
      exportCsv(
        "statistiques-joueurs.csv",
        ["Rang", "Joueur", "Catégorie", "Club", "Présence"],
        data.joueurs.classement.map((r) => [
          String(r.rang),
          r.joueur,
          r.categorie,
          r.club,
          `${r.presencePct}%`,
        ])
      );
    } else {
      exportCsv(
        "statistiques.csv",
        ["Indicateur", "Valeur"],
        data.stages.kpis.map((k) => [k.label, String(k.value)])
      );
    }
    toast("Export CSV lancé", "success");
  }

  async function handleExportPdf() {
    if (!data) return;
    await exportPdfReport(`statistiques-${filters.tab}.pdf`, {
      titre: `Statistiques FRMT — ${filters.tab}`,
      sousTitre: `Saison ${filters.saison} · ${filters.start_date} → ${filters.end_date}`,
      colonnes: ["Indicateur", "Valeur"],
      lignes: data.stages.kpis.map((k) => [k.label, String(k.value)]),
      kpis: data.stages.kpis.map((k) => ({ label: k.label, value: String(k.value), sub: k.sub })),
    });
    toast("Export PDF lancé", "success");
  }

  return (
    <>
      <V2PageHeader
        title="Statistiques"
        description="Tableau de bord analytique — stages, compétitions, budget et joueurs"
      />
      <main className="space-y-4 p-4 sm:p-6">
        <StatsFilterBar
          filters={filters}
          setFilter={setFilter}
          resetFilters={resetFilters}
          onApply={() => void refresh()}
          onExportCsv={handleExportCsv}
          onExportPdf={() => void handleExportPdf()}
          options={options}
          loading={loading}
        />

        <div className="flex flex-wrap gap-1 border-b border-[var(--border)] pb-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setFilter("tab", t.id)}
              className={cn(
                "rounded-t-lg px-4 py-2 text-sm font-medium transition",
                filters.tab === t.id
                  ? "border-b-2 border-frmt-gold text-frmt-gold"
                  : "text-muted hover:text-foreground"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading && !data ? (
          <p className="py-12 text-center text-muted">Chargement des statistiques…</p>
        ) : data ? (
          <div className={loading ? "pointer-events-none opacity-60" : ""}>
            {filters.tab === "stages" && <StatsStagesView data={data.stages} />}
            {filters.tab === "competitions" && (
              <StatsCompetitionsView data={data.competitions} />
            )}
            {filters.tab === "comparatif" && <StatsComparatifView data={data.comparatif} />}
            {filters.tab === "financier" && <StatsFinancierView data={data.financier} />}
            {filters.tab === "joueurs" && <StatsJoueursView data={data.joueurs} />}
          </div>
        ) : (
          <p className="py-12 text-center text-muted">Aucune donnée disponible.</p>
        )}
      </main>
    </>
  );
}

export function StatistiquesClient() {
  return (
    <Suspense fallback={<main className="p-6 text-muted">Chargement…</main>}>
      <StatistiquesContent />
    </Suspense>
  );
}
