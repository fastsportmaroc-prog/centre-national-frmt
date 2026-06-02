"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useRole } from "@/lib/hooks/useRole";
import { format } from "date-fns";
import { FileDown } from "lucide-react";
import { V2PageHeader } from "@/components/v2/V2PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useToast } from "@/components/v2/ui/ToastProvider";
import { exportReservationsPDF } from "@/lib/pdf/pdf-exports";
import { loadReservationsPageAction } from "@/lib/actions/reservations-page-actions";
import { fullReconcileReservationsAction } from "@/lib/actions/reservations-page-actions";
import { getStages } from "@/lib/supabase/queries";
import type { ReservationEnrichedV2 } from "@/lib/types/v2";
import {
  resolvePlannerRange,
  shiftPlannerPivot,
  type PlannerPeriodMode,
  type PlannerViewMode,
} from "@/lib/v2/reservations-planner";
import {
  CRENEAU_OPTIONS,
  conflictStageNames,
  dedupeReservationsForDisplay,
  formatDateHeader,
  normalizeStatut,
  parseReservationDate,
  resolveCreneauType,
  type CreneauType,
} from "@/lib/v2/reservations-utils";
import { reservationToConflictRow } from "@/lib/terrain/conflict-adapters";
import { conflictIdSet, detectConflicts } from "@/services/conflictDetector";
import { ReservationCard } from "@/components/v2/reservations/ReservationCard";
import { ReservationsPlannerToolbar } from "@/components/v2/reservations/ReservationsPlannerToolbar";
import { ReservationsTableView } from "@/components/v2/reservations/ReservationsTableView";
import { ReservationsTerrainConflictsPanel } from "@/components/v2/reservations/ReservationsTerrainConflictsPanel";
import { cn } from "@/lib/utils/cn";

export function ReservationsV2Client() {
  const { toast } = useToast();
  const { isAdmin } = useRole();
  const [items, setItems] = useState<ReservationEnrichedV2[]>([]);
  const [stages, setStages] = useState<Awaited<ReturnType<typeof getStages>>>([]);
  const [stageFilter, setStageFilter] = useState("all");
  const [creneauFilter, setCreneauFilter] = useState<CreneauType | "all">("all");
  const [periodMode, setPeriodMode] = useState<PlannerPeriodMode>("all");
  const [viewMode, setViewMode] = useState<PlannerViewMode>("list");
  const [pivotDate, setPivotDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [syncing, setSyncing] = useState(false);

  const plannerRange = useMemo(
    () => resolvePlannerRange(periodMode, pivotDate),
    [periodMode, pivotDate]
  );

  const load = useCallback(async () => {
    const [{ reservations: r }, s] = await Promise.all([
      loadReservationsPageAction({
        dateDebut: plannerRange?.dateDebut,
        dateFin: plannerRange?.dateFin,
        syncBeforeLoad: false,
      }),
      getStages(),
    ]);
    setItems(
      dedupeReservationsForDisplay(r).filter((x) => normalizeStatut(x.statut) !== "annule")
    );
    setStages(s);
  }, [plannerRange?.dateDebut, plannerRange?.dateFin]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
    const channel = supabase
      .channel("reservations-v2-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reservations_infrastructure" },
        () => void load()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "stages_programme" },
        () => void load()
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [load]);

  const conflictIds = useMemo(
    () => conflictIdSet(detectConflicts(items.map(reservationToConflictRow))),
    [items]
  );

  const filtered = useMemo(() => {
    return items.filter((r) => {
      if (stageFilter !== "all" && r.stage_id !== stageFilter) return false;
      if (creneauFilter !== "all" && resolveCreneauType(r) !== creneauFilter) return false;
      return true;
    });
  }, [items, stageFilter, creneauFilter]);

  const kpis = useMemo(() => {
    const courts = new Set(filtered.map((r) => r.infrastructure_id)).size;
    const conflitsInView = [...conflictIds].filter((id) => filtered.some((r) => r.id === id)).length;
    return { reservations: filtered.length, courts, conflits: conflitsInView };
  }, [filtered, conflictIds]);

  const groupedByDate = useMemo(() => {
    const map = new Map<string, ReservationEnrichedV2[]>();
    for (const r of filtered) {
      const key = format(parseReservationDate(r.date_debut), "yyyy-MM-dd");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  function filterSubtitle(): string {
    const parts: string[] = [];
    if (plannerRange?.label) parts.push(plannerRange.label);
    if (stageFilter !== "all") {
      parts.push(stages.find((s) => s.id === stageFilter)?.stage_action ?? "Stage");
    }
    if (creneauFilter !== "all") {
      parts.push(CRENEAU_OPTIONS.find((c) => c.value === creneauFilter)?.label ?? creneauFilter);
    }
    return parts.length ? `Filtré : ${parts.join(" — ")}` : "";
  }

  const loadWithSync = useCallback(async () => {
    const [{ reservations: r }, s] = await Promise.all([
      loadReservationsPageAction({
        dateDebut: plannerRange?.dateDebut,
        dateFin: plannerRange?.dateFin,
        syncBeforeLoad: true,
      }),
      getStages(),
    ]);
    setItems(
      dedupeReservationsForDisplay(r).filter((x) => normalizeStatut(x.statut) !== "annule")
    );
    setStages(s);
  }, [plannerRange?.dateDebut, plannerRange?.dateFin]);

  async function forceSyncAndReload() {
    setSyncing(true);
    try {
      const result = await fullReconcileReservationsAction();
      await loadWithSync();
      toast(
        `${result.processed} stage(s) traité(s), ${result.synced} aligné(s), ${result.cleaned} doublon(s) retiré(s)`,
        "success"
      );
    } catch (e) {
      toast(e instanceof Error ? e.message : "Erreur de synchronisation", "error");
    } finally {
      setSyncing(false);
    }
  }

  const rangeLabel = plannerRange?.label ?? "Toutes les périodes";

  return (
    <>
      <V2PageHeader
        title="Réservations"
        description="Vue des terrains réservés — alimentée automatiquement depuis chaque stage (onglet Terrains)"
        actions={
          <div className="flex flex-wrap gap-2">
            {isAdmin && (
              <Button
                variant="secondary"
                size="sm"
                disabled={syncing}
                onClick={() => void forceSyncAndReload()}
              >
                {syncing ? "Synchronisation…" : "Rafraîchir depuis les stages"}
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={() => exportReservationsPDF(filtered, filterSubtitle())}>
              <FileDown className="mr-1 h-3.5 w-3.5" />
              Imprimer / PDF
            </Button>
          </div>
        }
      />

      <main className="space-y-4 p-4 sm:p-6">
        {periodMode !== "all" && plannerRange && (
          <Card className="border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-100">
            Affichage limité à la période : <strong>{plannerRange.label}</strong>. Cliquez{" "}
            <button
              type="button"
              className="font-semibold text-frmt-green underline"
              onClick={() => setPeriodMode("all")}
            >
              Tout
            </button>{" "}
            pour voir toutes les réservations de tous les stages.
          </Card>
        )}

        <Card className="border-frmt-green/30 bg-frmt-green/5 p-3 text-sm">
          <p>
            <strong>Principe :</strong> chaque réservation affichée ici provient d&apos;un stage dont
            l&apos;onglet <strong>Terrains</strong> a été renseigné. Pour ajouter ou modifier une
            réservation, ouvrez le stage concerné — pas de saisie directe sur cette page.
          </p>
          <p className="mt-1 text-xs text-muted">
            <Link href="/v2/stages" className="text-frmt-green hover:underline">
              Voir les stages
            </Link>
          </p>
        </Card>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Card className="p-4 text-center">
            <div className="text-3xl font-bold text-frmt-green">{kpis.reservations}</div>
            <div className="mt-1 text-sm text-muted">
              Réservations {plannerRange ? "sur la période" : ""}
            </div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-3xl font-bold">{kpis.courts}</div>
            <div className="mt-1 text-sm text-muted">Courts utilisés</div>
          </Card>
          <Card
            className={cn(
              "p-4 text-center",
              kpis.conflits > 0 && "border-red-500/50 bg-red-500/5"
            )}
          >
            <div className={cn("text-3xl font-bold", kpis.conflits > 0 && "text-red-500")}>
              {kpis.conflits}
            </div>
            <div className="mt-1 text-sm text-muted">Doubles réservations (conflits)</div>
          </Card>
        </div>

        <ReservationsPlannerToolbar
          periodMode={periodMode}
          viewMode={viewMode}
          pivotDate={pivotDate}
          rangeLabel={rangeLabel}
          stageFilter={stageFilter}
          creneauFilter={creneauFilter}
          stages={stages}
          onPeriodChange={setPeriodMode}
          onViewChange={setViewMode}
          onPivotChange={setPivotDate}
          onShiftPivot={(dir) => setPivotDate(shiftPlannerPivot(pivotDate, periodMode, dir))}
          onStageFilter={setStageFilter}
          onCreneauFilter={setCreneauFilter}
        />

        <ReservationsTerrainConflictsPanel items={items} />

        {filtered.length === 0 && (
          <Card className="border-dashed p-8 text-center text-sm text-muted">
            Aucune réservation pour ces filtres.
            <br />
            Créez des demandes terrain sur un stage, onglet <strong>Terrains</strong>.
          </Card>
        )}

        {viewMode === "table" && filtered.length > 0 && (
          <ReservationsTableView rows={filtered} conflictIds={conflictIds} />
        )}

        {viewMode === "list" && (
          <div className="space-y-6">
            {groupedByDate.map(([dateKey, rows]) => {
              const weekend = [0, 6].includes(parseReservationDate(dateKey).getDay());
              return (
                <section key={dateKey}>
                  <div
                    className={cn(
                      "mb-3 border-b border-border pb-1 text-sm font-bold capitalize",
                      weekend && "text-frmt-green"
                    )}
                  >
                    {formatDateHeader(dateKey)}
                  </div>
                  <div
                    className={cn(
                      "grid gap-3 md:grid-cols-2 xl:grid-cols-3",
                      weekend && "rounded-lg bg-surface-elevated/40 p-2"
                    )}
                  >
                    {rows.map((r) => (
                      <ReservationCard
                        key={r.id}
                        r={r}
                        conflict={conflictIds.has(r.id)}
                        conflictLabel={conflictStageNames(r, items, conflictIds)}
                        onEdit={() => {
                          if (r.stage_id) {
                            window.location.href = `/v2/stages/${encodeURIComponent(r.stage_id)}?tab=terrains`;
                          }
                        }}
                        onDelete={() => {
                          if (r.stage_id) {
                            window.location.href = `/v2/stages/${encodeURIComponent(r.stage_id)}?tab=terrains`;
                          }
                        }}
                      />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
