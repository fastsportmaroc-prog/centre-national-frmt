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
import { getJoueurs } from "@/lib/supabase/queries";
import type { JoueurV2 } from "@/lib/types/v2";
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
  fetchProgrammationEvenements,
  updateProgrammationEvenement,
} from "@/lib/programmation-joueurs/client-api";
import { FiltresProgrammation } from "./FiltresProgrammation";
import { PlanningTimeline, type PlanningViewMode } from "./PlanningTimeline";
import { EvenementDrawer } from "./EvenementDrawer";
import { FormulaireEvenement } from "./FormulaireEvenement";
import { SelectionExportBar } from "./SelectionExportBar";
import { ExportOptionsModal } from "./ExportOptionsModal";
import { cn } from "@/lib/utils/cn";
import { getJoueurDisplayCategorie, matchesJoueurCategoryFilter } from "@/lib/utils/joueur";
import { normalizeSearchText } from "@/lib/v2/global-search";

const VIEW_MODES: { id: PlanningViewMode; label: string }[] = [
  { id: "mensuelle", label: "Mensuelle" },
  { id: "hebdomadaire", label: "Hebdomadaire" },
  { id: "annuelle", label: "Annuelle" },
  { id: "plage", label: "Plage" },
];

function defaultRange(view: PlanningViewMode, filters: ProgrammationFilters) {
  if (filters.dateDebut && filters.dateFin) {
    return { start: filters.dateDebut.slice(0, 10), end: filters.dateFin.slice(0, 10) };
  }
  const now = new Date();
  if (view === "annuelle") {
    return {
      start: format(startOfYear(now), "yyyy-MM-dd"),
      end: format(endOfYear(now), "yyyy-MM-dd"),
    };
  }
  if (view === "hebdomadaire") {
    const ws = startOfWeek(now, { weekStartsOn: 1 });
    const we = endOfWeek(now, { weekStartsOn: 1 });
    return { start: format(ws, "yyyy-MM-dd"), end: format(we, "yyyy-MM-dd") };
  }
  return {
    start: format(startOfMonth(now), "yyyy-MM-dd"),
    end: format(endOfMonth(now), "yyyy-MM-dd"),
  };
}

export function ProgrammationJoueursClient() {
  const { toast } = useToast();
  const [joueurs, setJoueurs] = useState<JoueurV2[]>([]);
  const [evenements, setEvenements] = useState<ProgrammationEvenementEnriched[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<ProgrammationFilters>({});
  const [viewMode, setViewMode] = useState<PlanningViewMode>("mensuelle");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [drawerEv, setDrawerEv] = useState<ProgrammationEvenementEnriched | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editEv, setEditEv] = useState<ProgrammationEvenementEnriched | null>(null);
  const [exportOpen, setExportOpen] = useState(false);

  const range = useMemo(() => defaultRange(viewMode, filters), [viewMode, filters]);

  const filteredJoueurs = useMemo(() => {
    let list = [...joueurs];
    if (filters.categorieJoueur) {
      list = list.filter((j) => matchesJoueurCategoryFilter(j, filters.categorieJoueur!));
    }
    const tokens = normalizeSearchText(filters.search ?? "")
      .split(/\s+/)
      .filter(Boolean);
    if (tokens.length) {
      const eventJoueurIds = new Set(evenements.map((e) => e.joueur_id));
      list = list.filter((j) => {
        const hay = normalizeSearchText(
          `${j.prenom} ${j.nom} ${j.club ?? ""} ${getJoueurDisplayCategorie(j)} ${j.licence ?? ""}`
        );
        const joueurMatch = tokens.every((t) => hay.includes(t));
        return joueurMatch || eventJoueurIds.has(j.id);
      });
    }
    return list;
  }, [joueurs, filters.categorieJoueur, filters.search, evenements]);

  const filteredEvenements = useMemo(() => {
    const joueurIds = new Set(filteredJoueurs.map((j) => j.id));
    return evenements.filter((e) => joueurIds.has(e.joueur_id));
  }, [evenements, filteredJoueurs]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { categorieJoueur: _cat, ...apiFilters } = filters;
      const [jRes, eRes] = await Promise.all([
        getJoueurs(),
        fetchProgrammationEvenements({
          ...apiFilters,
          dateDebut: range.start,
          dateFin: range.end,
        }),
      ]);
      setJoueurs(jRes);
      if (eRes.error) toast(eRes.error, "error");
      setEvenements(eRes.evenements);
    } finally {
      setLoading(false);
    }
  }, [filters, range.start, range.end, toast]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    setSelectedIds((prev) => {
      const next = new Set([...prev].filter((id) => filteredJoueurs.some((j) => j.id === id)));
      return next.size === prev.size ? prev : next;
    });
  }, [filteredJoueurs]);

  function patchFilters(patch: Partial<ProgrammationFilters>) {
    setFilters((prev) => ({ ...prev, ...patch }));
  }

  function resetFilters() {
    setFilters({});
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

  return (
    <>
      <V2PageHeader
        title="Programmation Joueurs"
        description="Planning tournois, stages et repos — vue centralisée de tous les joueurs actifs"
      />
      <main className="space-y-4 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1">
            {VIEW_MODES.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setViewMode(v.id)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium",
                  viewMode === v.id
                    ? "bg-[var(--frmt-navy)] text-white"
                    : "text-[var(--text-secondary)] hover:text-white"
                )}
              >
                {v.label}
              </button>
            ))}
          </div>
          <Button onClick={() => { setEditEv(null); setFormOpen(true); }}>
            <Plus className="mr-1 h-4 w-4" /> Ajouter un événement
          </Button>
        </div>

        <FiltresProgrammation filters={filters} onChange={patchFilters} onReset={resetFilters} />

        <Card className="overflow-hidden bg-[var(--bg-card)] p-0">
          {loading ? (
            <p className="p-6 text-sm text-[var(--text-secondary)]">Chargement…</p>
          ) : (
            <PlanningTimeline
              joueurs={filteredJoueurs}
              evenements={filteredEvenements}
              viewMode={viewMode}
              rangeStart={range.start}
              rangeEnd={range.end}
              selectedJoueurIds={selectedIds}
              onToggleJoueur={toggleJoueur}
              onEventClick={setDrawerEv}
            />
          )}
        </Card>

        <div className="flex flex-wrap gap-2 text-xs text-[var(--text-secondary)]">
          <span className="inline-flex items-center gap-1"><span className="h-2 w-4 rounded bg-[#276749]" /> Stage CN</span>
          <span className="inline-flex items-center gap-1"><span className="h-2 w-4 rounded bg-[#2B6CB0]" /> ITF</span>
          <span className="inline-flex items-center gap-1"><span className="h-2 w-4 rounded bg-[#C05621]" /> ATP/WTA</span>
          <span className="inline-flex items-center gap-1"><span className="h-2 w-4 rounded bg-[#553C9A]" /> Équipes</span>
          <span className="inline-flex items-center gap-1"><span className="h-2 w-4 rounded bg-[#4A5568]" /> Repos</span>
          <span className="inline-flex items-center gap-1"><span className="h-2 w-4 rounded bg-[#C53030]" /> Sélection</span>
        </div>
      </main>

      <EvenementDrawer
        evenement={drawerEv}
        onClose={() => setDrawerEv(null)}
        onEdit={(ev) => { setEditEv(ev); setFormOpen(true); setDrawerEv(null); }}
        onDelete={(id) => void handleDelete(id)}
      />

      <FormulaireEvenement
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditEv(null); }}
        joueurs={joueurs}
        initial={editEv}
        onSubmit={handleFormSubmit}
      />

      <SelectionExportBar count={selectedIds.size} onExport={() => setExportOpen(true)} />

      <ExportOptionsModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        joueurCount={selectedIds.size}
        onConfirm={async (opts) => {
          try {
            await exportProgrammationPdf({
              joueurIds: [...selectedIds],
              ...opts,
            });
            toast("PDF téléchargé", "success");
          } catch (e) {
            toast(e instanceof Error ? e.message : "Erreur PDF", "error");
          }
        }}
      />
    </>
  );
}
