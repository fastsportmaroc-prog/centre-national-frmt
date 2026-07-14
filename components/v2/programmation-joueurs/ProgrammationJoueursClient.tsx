"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from "date-fns";
import { Plus } from "lucide-react";
import { V2PageHeader } from "@/components/v2/V2PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useToast } from "@/components/v2/ui/ToastProvider";
import { getEntraineurs, getJoueurs } from "@/lib/supabase/queries";
import type { EntraineurV2, JoueurV2 } from "@/lib/types/v2";
import type {
  CreateProgrammationPayload,
  ProgrammationEvenementEnriched,
  ProgrammationEvenementInput,
  ProgrammationFilters,
} from "@/lib/types/programmation-joueurs";
import {
  createProgrammationEvenements,
  deleteProgrammationEvenement,
  exportProgrammationPdf,
  exportProgrammationCneExcel,
  exportProgrammationCnePdf,
  fetchProgrammationEvenements,
  updateProgrammationEvenement,
} from "@/lib/programmation-joueurs/client-api";
import { FiltresProgrammation } from "./FiltresProgrammation";
import { FiltresPlanningCNE } from "./FiltresPlanningCNE";
import { PlanningCNELegend } from "./PlanningCNELegend";
import { PlanningPrevisionnelCNE } from "./PlanningPrevisionnelCNE";
import { PlanningTimeline, type PlanningViewMode } from "./PlanningTimeline";
import {
  buildCoachColumns,
  buildJoueurColumns,
  filterColumnsByDisplay,
  pruneVisibleColumns,
  syncVisibleColumnsForDisplayMode,
  type PlanningCneDisplayMode,
  type PlanningCnePeriodPreset,
} from "@/lib/programmation-joueurs/planning-cne-grid";
import { rangeForCnePreset, formatPlanningCnePeriodFr, sanitizePlanningCneRange } from "@/lib/programmation-joueurs/planning-cne-period";
import { mergeProgrammationDateFilters } from "@/lib/programmation-joueurs/filter-dates";
import { filterCoachesForPlanningScope } from "@/lib/programmation-joueurs/planning-cne-coaches-filter";
import { EvenementDrawer } from "./EvenementDrawer";
import { FormulaireEvenement } from "./FormulaireEvenement";
import { SelectionExportBar } from "./SelectionExportBar";
import { ExportPdfModal } from "./ExportPdfModal";
import { cn } from "@/lib/utils/cn";
import { getJoueurDisplayCategorie, matchesJoueurCategoryFilter } from "@/lib/utils/joueur";
import { normalizeSearchText } from "@/lib/v2/global-search";
import { useUserPermissions } from "@/lib/hooks/useUserPermissions";

type MainLayoutMode = "timeline" | "planning_cne";

const MAIN_LAYOUT_MODES: { id: MainLayoutMode; label: string }[] = [
  { id: "timeline", label: "Vue timeline" },
  { id: "planning_cne", label: "Planning CNE" },
];

const VIEW_MODES: { id: PlanningViewMode; label: string }[] = [
  { id: "mensuelle", label: "Mensuelle" },
  { id: "hebdomadaire", label: "Hebdomadaire" },
  { id: "annuelle", label: "Annuelle" },
  { id: "plage", label: "Plage" },
];

function defaultRange(view: PlanningViewMode, filters: ProgrammationFilters) {
  if (filters.dateDebut && filters.dateFin) {
    const { start, end } = sanitizePlanningCneRange(
      filters.dateDebut,
      filters.dateFin
    );
    return { start, end, truncated: false };
  }
  const now = new Date();
  if (view === "annuelle") {
    return {
      start: format(startOfYear(now), "yyyy-MM-dd"),
      end: format(endOfYear(now), "yyyy-MM-dd"),
      truncated: false,
    };
  }
  if (view === "hebdomadaire") {
    const ws = startOfWeek(now, { weekStartsOn: 1 });
    const we = endOfWeek(now, { weekStartsOn: 1 });
    return { start: format(ws, "yyyy-MM-dd"), end: format(we, "yyyy-MM-dd"), truncated: false };
  }
  return {
    start: format(startOfMonth(now), "yyyy-MM-dd"),
    end: format(endOfMonth(now), "yyyy-MM-dd"),
    truncated: false,
  };
}

export function ProgrammationJoueursClient() {
  const { toast } = useToast();
  const {
    filterJoueurs,
    sanitizeCategoryParam,
    hasCategoryRestrictions,
    categoryContext,
    planningCne,
  } = useUserPermissions();

  /** Affichage planning : coaches pour tous les rôles sauf vue perso joueur (sans changer les droits RBAC). */
  const planningShowsCoaches = !planningCne.selfOnly;
  const [joueurs, setJoueurs] = useState<JoueurV2[]>([]);
  const [coaches, setCoaches] = useState<EntraineurV2[]>([]);
  const [evenements, setEvenements] = useState<ProgrammationEvenementEnriched[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<ProgrammationFilters>({});
  const [mainLayout, setMainLayout] = useState<MainLayoutMode>("timeline");
  const [viewMode, setViewMode] = useState<PlanningViewMode>("mensuelle");
  const [cnePeriodPreset, setCnePeriodPreset] = useState<PlanningCnePeriodPreset>("ce_mois");
  const [cneDisplayMode, setCneDisplayMode] = useState<PlanningCneDisplayMode>("both");
  const [visibleColumnIds, setVisibleColumnIds] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [drawerEv, setDrawerEv] = useState<ProgrammationEvenementEnriched | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editEv, setEditEv] = useState<ProgrammationEvenementEnriched | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportingCnePdf, setExportingCnePdf] = useState(false);
  const [migrationRequired, setMigrationRequired] = useState(false);

  const layoutModes = useMemo(
    () =>
      planningCne.selfOnly
        ? MAIN_LAYOUT_MODES.filter((m) => m.id === "planning_cne")
        : MAIN_LAYOUT_MODES,
    [planningCne.selfOnly]
  );

  const pageDescription = planningCne.selfOnly
    ? "Votre planning personnel — tournois, stages et repos"
    : "Planning tournois, stages et repos — joueurs et coaches dans le même tableau";

  const apiFilters = useMemo(() => {
    const next = { ...filters };
    if (hasCategoryRestrictions) {
      const enforced = sanitizeCategoryParam(filters.categorieJoueur);
      next.categorieJoueur = enforced;
    }
    return next;
  }, [filters, hasCategoryRestrictions, sanitizeCategoryParam]);

  const range = useMemo(() => {
    if (mainLayout === "planning_cne") {
      return rangeForCnePreset(cnePeriodPreset, {
        dateDebut: apiFilters.dateDebut,
        dateFin: apiFilters.dateFin,
      });
    }
    const { start, end } = defaultRange(viewMode, apiFilters);
    return { start, end, truncated: false };
  }, [mainLayout, cnePeriodPreset, viewMode, apiFilters]);

  const rangeLabelFr = useMemo(
    () => formatPlanningCnePeriodFr(range.start, range.end),
    [range.start, range.end]
  );

  const filteredJoueurs = useMemo(() => {
    let list = filterJoueurs([...joueurs]);
    if (planningCne.selfOnly) {
      if (!planningCne.selfJoueurId) return [];
      list = list.filter((j) => j.id === planningCne.selfJoueurId);
    }
    if (apiFilters.categorieJoueur) {
      list = list.filter((j) => matchesJoueurCategoryFilter(j, apiFilters.categorieJoueur!));
    }
    const tokens = normalizeSearchText(apiFilters.search ?? "")
      .split(/\s+/)
      .filter(Boolean);
    if (tokens.length) {
      list = list.filter((j) => {
        const hay = normalizeSearchText(
          `${j.prenom} ${j.nom} ${j.club ?? ""} ${getJoueurDisplayCategorie(j)} ${j.licence ?? ""}`
        );
        return tokens.every((t) => hay.includes(t));
      });
    }
    return list;
  }, [
    joueurs,
    filterJoueurs,
    planningCne.selfOnly,
    planningCne.selfJoueurId,
    apiFilters.categorieJoueur,
    apiFilters.search,
  ]);

  const allowedJoueurIds = useMemo(
    () => new Set(filteredJoueurs.map((j) => j.id)),
    [filteredJoueurs]
  );

  const filteredCoaches = useMemo(() => {
    let list = filterCoachesForPlanningScope(coaches, evenements, {
      allowedJoueurIds,
      allowedCategories: categoryContext.allowedCategories,
      categoryRestricted: categoryContext.restricted,
    });

    const tokens = normalizeSearchText(apiFilters.search ?? "")
      .split(/\s+/)
      .filter(Boolean);
    if (tokens.length) {
      const eventCoachIds = new Set(
        evenements
          .map((e) => e.cne_column_id)
          .filter((id): id is string => Boolean(id?.startsWith("coach-")))
      );
      list = list.filter((c) => {
        const colId = `coach-${c.id}`;
        const hay = normalizeSearchText(`${c.prenom} ${c.nom} ${c.specialite ?? ""}`);
        const coachMatch = tokens.every((t) => hay.includes(t));
        return coachMatch || eventCoachIds.has(colId);
      });
    }
    return list;
  }, [coaches, evenements, categoryContext, allowedJoueurIds, apiFilters.search]);

  const filteredEvenementsTimeline = useMemo(() => {
    return evenements.filter((e) => allowedJoueurIds.has(e.joueur_id));
  }, [evenements, allowedJoueurIds]);

  const allowedCoachColIds = useMemo(
    () => new Set(filteredCoaches.map((c) => `coach-${c.id}`)),
    [filteredCoaches]
  );

  const filteredEvenementsCne = useMemo(() => {
    return evenements.filter((e) => {
      const colId = e.cne_column_id ?? e.joueur_id;
      if (!visibleColumnIds.has(colId)) return false;
      if (colId.startsWith("coach-")) {
        return planningShowsCoaches && allowedCoachColIds.has(colId);
      }
      return allowedJoueurIds.has(e.joueur_id);
    });
  }, [
    evenements,
    visibleColumnIds,
    allowedJoueurIds,
    allowedCoachColIds,
    planningShowsCoaches,
  ]);

  const cneColumns = useMemo(() => {
    const joueurCols = buildJoueurColumns(filteredJoueurs);
    const coachCols = planningShowsCoaches ? buildCoachColumns(filteredCoaches) : [];
    const mode = planningShowsCoaches ? cneDisplayMode : "joueurs";
    return filterColumnsByDisplay([...joueurCols, ...coachCols], mode);
  }, [filteredJoueurs, filteredCoaches, cneDisplayMode, planningShowsCoaches]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { categorieJoueur, ...rest } = apiFilters;
      const [jRes, cRes, eRes] = await Promise.all([
        getJoueurs(),
        !planningCne.selfOnly ? getEntraineurs() : Promise.resolve([] as EntraineurV2[]),
        fetchProgrammationEvenements({
          ...rest,
          categorieJoueur,
          dateDebut: range.start,
          dateFin: range.end,
        }),
      ]);
      setJoueurs(jRes);
      setCoaches(cRes);
      setMigrationRequired(Boolean(eRes.migrationRequired));
      if (eRes.error && !eRes.migrationRequired) toast(eRes.error, "error");
      const scopedJoueurIds = new Set(filterJoueurs(jRes).map((j) => j.id));
      setEvenements(
        eRes.evenements.filter((e) => {
          const colId = e.cne_column_id ?? e.joueur_id;
          if (colId.startsWith("coach-")) return planningShowsCoaches;
          return scopedJoueurIds.has(e.joueur_id);
        })
      );
    } finally {
      setLoading(false);
    }
  }, [apiFilters, range.start, range.end, toast, planningShowsCoaches, filterJoueurs]);

  useEffect(() => {
    if (mainLayout !== "planning_cne") return;
    setFilters((prev) => {
      if (prev.dateDebut && prev.dateFin) return prev;
      const r = rangeForCnePreset(cnePeriodPreset, prev);
      return { ...prev, dateDebut: r.start, dateFin: r.end };
    });
  }, [mainLayout, cnePeriodPreset]);

  useEffect(() => {
    if (planningCne.defaultLayout === "planning_cne") {
      setMainLayout("planning_cne");
    }
  }, [planningCne.defaultLayout]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    setSelectedIds((prev) => {
      const next = new Set([...prev].filter((id) => filteredJoueurs.some((j) => j.id === id)));
      return next.size === prev.size ? prev : next;
    });
  }, [filteredJoueurs]);

  useEffect(() => {
    if (planningCne.selfOnly && planningCne.selfJoueurId) {
      setVisibleColumnIds(new Set([planningCne.selfJoueurId]));
      return;
    }
    const joueurIds = filteredJoueurs.map((j) => j.id);
    const coachIds = planningShowsCoaches
      ? filteredCoaches.map((c) => `coach-${c.id}`)
      : [];
    const mode = planningShowsCoaches ? cneDisplayMode : "joueurs";
    setVisibleColumnIds((prev) =>
      pruneVisibleColumns(mode, prev, joueurIds, coachIds)
    );
  }, [
    filteredJoueurs,
    filteredCoaches,
    planningCne.selfOnly,
    planningCne.selfJoueurId,
    planningShowsCoaches,
    cneDisplayMode,
  ]);

  function handleCneDisplayModeChange(mode: PlanningCneDisplayMode) {
    setCneDisplayMode(mode);
    if (planningCne.selfOnly) return;
    const joueurIds = filteredJoueurs.map((j) => j.id);
    const coachIds = planningShowsCoaches
      ? filteredCoaches.map((c) => `coach-${c.id}`)
      : [];
    setVisibleColumnIds((prev) =>
      syncVisibleColumnsForDisplayMode(mode, prev, joueurIds, coachIds)
    );
  }

  function patchFilters(patch: Partial<ProgrammationFilters>) {
    const hasDatePatch = "dateDebut" in patch || "dateFin" in patch;
    setFilters((prev) => mergeProgrammationDateFilters(prev, patch));
    if (mainLayout === "planning_cne" && hasDatePatch) {
      setCnePeriodPreset("personnalise");
    }
  }

  function handleCnePeriodPresetChange(preset: PlanningCnePeriodPreset) {
    setCnePeriodPreset(preset);
    if (preset === "personnalise") {
      const now = new Date();
      setFilters((prev) => ({
        ...prev,
        dateDebut:
          prev.dateDebut?.slice(0, 10) || format(startOfMonth(now), "yyyy-MM-dd"),
        dateFin: prev.dateFin?.slice(0, 10) || format(endOfMonth(now), "yyyy-MM-dd"),
      }));
      return;
    }
    const { start, end } = rangeForCnePreset(preset, {});
    setFilters((prev) => ({ ...prev, dateDebut: start, dateFin: end }));
  }

  function resetFilters() {
    setFilters({});
    setCnePeriodPreset("ce_mois");
    const mode = planningShowsCoaches ? "both" : "joueurs";
    setCneDisplayMode(mode);
    const joueurIds = filteredJoueurs.map((j) => j.id);
    const coachIds = planningShowsCoaches
      ? filteredCoaches.map((c) => `coach-${c.id}`)
      : [];
    setVisibleColumnIds(syncVisibleColumnsForDisplayMode(mode, [], joueurIds, coachIds));
  }

  function selectAllJoueurColumns(ids: string[]) {
    setVisibleColumnIds((prev) => {
      const coachIds = [...prev].filter((id) => id.startsWith("coach-"));
      return new Set([...coachIds, ...ids]);
    });
  }

  function clearJoueurColumns() {
    setVisibleColumnIds((prev) => new Set([...prev].filter((id) => id.startsWith("coach-"))));
  }

  function selectAllCoachColumns(ids: string[]) {
    setVisibleColumnIds((prev) => {
      const joueurIds = [...prev].filter((id) => !id.startsWith("coach-"));
      return new Set([...joueurIds, ...ids]);
    });
  }

  function clearCoachColumns() {
    setVisibleColumnIds((prev) => new Set([...prev].filter((id) => !id.startsWith("coach-"))));
  }

  function toggleCneColumn(id: string) {
    setVisibleColumnIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleJoueur(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleFormSubmit(
    payload: CreateProgrammationPayload | Partial<ProgrammationEvenementInput>,
    isEdit: boolean,
    id?: string
  ) {
    if (isEdit && id) {
      const { evenement, error } = await updateProgrammationEvenement(id, payload);
      if (error) {
        toast(error, "error");
        return;
      }
      toast("Événement mis à jour", "success");
    } else {
      const { error } = await createProgrammationEvenements(payload as CreateProgrammationPayload);
      if (error) {
        toast(error, "error");
        return;
      }
      toast("Événement créé", "success");
    }
    await refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer cet événement ?")) return;
    const { error } = await deleteProgrammationEvenement(id);
    if (error) {
      toast(error, "error");
      return;
    }
    setDrawerEv(null);
    toast("Événement supprimé", "success");
    await refresh();
  }

  async function handleExportExcel() {
    if (visibleColumnIds.size < 1) {
      toast("Sélectionnez au moins une colonne", "error");
      return;
    }
    setExportingExcel(true);
    try {
      await exportProgrammationCneExcel({
        dateDebut: range.start,
        dateFin: range.end,
        columnIds: [...visibleColumnIds],
        displayMode: cneDisplayMode,
        categorieJoueur: apiFilters.categorieJoueur,
      });
      toast("Excel téléchargé", "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Erreur export Excel", "error");
    } finally {
      setExportingExcel(false);
    }
  }

  async function handleExportCnePdf() {
    if (visibleColumnIds.size < 1) {
      toast("Sélectionnez au moins une colonne", "error");
      return;
    }
    setExportingCnePdf(true);
    try {
      await exportProgrammationCnePdf({
        dateDebut: range.start,
        dateFin: range.end,
        columnIds: [...visibleColumnIds],
        displayMode: cneDisplayMode,
        categorieJoueur: apiFilters.categorieJoueur,
      });
      toast("PDF téléchargé", "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Erreur export PDF", "error");
    } finally {
      setExportingCnePdf(false);
    }
  }

  return (
    <>
      <V2PageHeader
        title={planningCne.selfOnly ? "Mon planning" : "Programmes"}
        description={pageDescription}
      />
      <main className="space-y-4 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1">
            {layoutModes.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setMainLayout(v.id)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium",
                  mainLayout === v.id
                    ? "bg-[var(--frmt-navy)] text-white"
                    : "text-[var(--text-secondary)] hover:text-white"
                )}
              >
                {v.label}
              </button>
            ))}
            {mainLayout === "timeline" &&
              VIEW_MODES.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setViewMode(v.id)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-xs font-medium",
                    viewMode === v.id
                      ? "bg-[var(--frmt-navy)]/70 text-white"
                      : "text-[var(--text-secondary)] hover:text-white"
                  )}
                >
                  {v.label}
                </button>
              ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {planningCne.canManageEvents && (
              <Button onClick={() => { setEditEv(null); setFormOpen(true); }}>
                <Plus className="mr-1 h-4 w-4" /> Ajouter un événement
              </Button>
            )}
          </div>
        </div>

        {mainLayout === "planning_cne" ? (
          <FiltresPlanningCNE
            filters={filters}
            onChange={patchFilters}
            onReset={resetFilters}
            periodPreset={cnePeriodPreset}
            onPeriodPresetChange={handleCnePeriodPresetChange}
            displayMode={cneDisplayMode}
            onDisplayModeChange={handleCneDisplayModeChange}
            joueurs={filteredJoueurs}
            coaches={filteredCoaches}
            visibleColumnIds={visibleColumnIds}
            onToggleColumn={toggleCneColumn}
            onSelectAllJoueurColumns={selectAllJoueurColumns}
            onClearJoueurColumns={clearJoueurColumns}
            onSelectAllCoachColumns={selectAllCoachColumns}
            onClearCoachColumns={clearCoachColumns}
            canSelectPlayers={planningCne.canSelectPlayers}
            enableDisplayModeFilter={planningShowsCoaches}
            selfOnly={planningCne.selfOnly}
            rangeLabelFr={rangeLabelFr}
            rangeTruncated={range.truncated}
            canExport={planningCne.canExport}
            exportingExcel={exportingExcel}
            exportingCnePdf={exportingCnePdf}
            exportDisabled={visibleColumnIds.size < 1}
            onExportExcel={() => void handleExportExcel()}
            onExportCnePdf={() => void handleExportCnePdf()}
          />
        ) : (
          <FiltresProgrammation filters={filters} onChange={patchFilters} onReset={resetFilters} />
        )}

        {mainLayout === "planning_cne" && range.truncated && (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            La période affichée est limitée à 124 jours pour garantir la fluidité de l&apos;interface.
          </div>
        )}

        {planningCne.selfOnly && !planningCne.selfJoueurId && (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            <p className="font-medium">Compte non lié à une fiche joueur</p>
            <p className="mt-1 text-amber-100/90">
              Votre email doit correspondre à la fiche joueur dans le système. Contactez
              l&apos;administrateur FRMT pour activer l&apos;accès à votre planning.
            </p>
          </div>
        )}

        {migrationRequired && (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            <p className="font-medium">Configuration base de données requise</p>
            <p className="mt-1 text-amber-100/90">
              La table <code className="text-xs">programmation_evenements</code> n&apos;existe pas encore
              sur Supabase. Ouvrez <strong>Supabase → SQL Editor</strong>, exécutez le fichier{" "}
              <code className="text-xs">lib/db/migrations/programmation_evenements.sql</code>, puis
              rechargez le schéma API (Settings → API → Reload). Ensuite rafraîchissez cette page.
            </p>
          </div>
        )}

        <Card className="overflow-hidden bg-[var(--bg-card)] p-0">
          {loading ? (
            <p className="p-6 text-sm text-[var(--text-secondary)]">Chargement…</p>
          ) : mainLayout === "planning_cne" ? (
            <PlanningPrevisionnelCNE
              columns={cneColumns}
              evenements={filteredEvenementsCne}
              rangeStart={range.start}
              rangeEnd={range.end}
              visibleColumnIds={visibleColumnIds}
              onEventClick={setDrawerEv}
            />
          ) : (
            <PlanningTimeline
              joueurs={filteredJoueurs}
              evenements={filteredEvenementsTimeline}
              viewMode={viewMode}
              rangeStart={range.start}
              rangeEnd={range.end}
              selectedJoueurIds={selectedIds}
              onToggleJoueur={toggleJoueur}
              onEventClick={setDrawerEv}
            />
          )}
        </Card>

        {mainLayout === "planning_cne" ? (
          <PlanningCNELegend />
        ) : (
          <div className="flex flex-wrap gap-2 text-xs text-[var(--text-secondary)]">
            <span className="inline-flex items-center gap-1"><span className="h-2 w-4 rounded bg-[#276749]" /> Stage CN</span>
            <span className="inline-flex items-center gap-1"><span className="h-2 w-4 rounded bg-[#2B6CB0]" /> ITF</span>
            <span className="inline-flex items-center gap-1"><span className="h-2 w-4 rounded bg-[#C05621]" /> ATP/WTA</span>
            <span className="inline-flex items-center gap-1"><span className="h-2 w-4 rounded bg-[#553C9A]" /> Équipes</span>
            <span className="inline-flex items-center gap-1"><span className="h-2 w-4 rounded bg-[#4A5568]" /> Repos</span>
            <span className="inline-flex items-center gap-1"><span className="h-2 w-4 rounded bg-[#C53030]" /> Sélection</span>
          </div>
        )}
      </main>

      <EvenementDrawer
        evenement={drawerEv}
        onClose={() => setDrawerEv(null)}
        onEdit={
          planningCne.canManageEvents
            ? (ev) => { setEditEv(ev); setFormOpen(true); setDrawerEv(null); }
            : undefined
        }
        onDelete={
          planningCne.canManageEvents ? (id) => void handleDelete(id) : undefined
        }
      />

      {planningCne.canManageEvents && (
        <FormulaireEvenement
          open={formOpen}
          onClose={() => { setFormOpen(false); setEditEv(null); }}
          joueurs={joueurs}
          initial={editEv}
          onSubmit={handleFormSubmit}
        />
      )}

      {planningCne.canExport && !planningCne.selfOnly && (
        <SelectionExportBar count={selectedIds.size} onExport={() => setExportOpen(true)} />
      )}

      {planningCne.canExport && !planningCne.selfOnly && (
        <ExportPdfModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        joueurs={filteredJoueurs}
        defaultSelectedIds={[...selectedIds]}
        onConfirm={async (opts) => {
          try {
            await exportProgrammationPdf(opts);
            toast("PDF téléchargé", "success");
          } catch (e) {
            toast(e instanceof Error ? e.message : "Erreur PDF", "error");
          }
        }}
      />
      )}
    </>
  );
}
