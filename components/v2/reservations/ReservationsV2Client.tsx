"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useRole } from "@/lib/hooks/useRole";
import { format } from "date-fns";
import { FileDown, Plus } from "lucide-react";
import { V2PageHeader } from "@/components/v2/V2PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Label } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/v2/ui/ConfirmDialog";
import { useToast } from "@/components/v2/ui/ToastProvider";
import { exportReservationsPDF } from "@/lib/pdf/pdf-exports";
import { syncPlanningAfterReservationChangeAction } from "@/lib/actions/reservation-planning-sync";
import { loadReservationsPlannerAction } from "@/lib/actions/reservations-planner-actions";
import { fullReconcileReservationsAction } from "@/lib/actions/reservations-page-actions";
import {
  createReservationInfrastructure,
  deleteReservationInfrastructure,
  getInfrastructures,
  getStages,
  updateReservationInfrastructure,
} from "@/lib/supabase/queries";
import type { CreneauReservationV2, InfrastructureV2, ReservationEnrichedV2 } from "@/lib/types/v2";
import type { PlanningSlotEnriched } from "@/lib/v2/reservations-planner-types";
import {
  analyzePlannerConflicts,
  conflictKindLabel,
} from "@/lib/v2/reservations-planning-conflicts";
import {
  daysInPlannerRange,
  resolvePlannerRange,
  shiftPlannerPivot,
  type PlannerPeriodMode,
  type PlannerViewMode,
} from "@/lib/v2/reservations-planner";
import {
  CRENEAU_OPTIONS,
  buildReservationDateTimes,
  conflictStageNames,
  dedupeReservationsForDisplay,
  formatDateHeader,
  normalizeStatut,
  parseReservationDate,
  resolveCreneauType,
  type CreneauType,
} from "@/lib/v2/reservations-utils";
import { ReservationCard } from "@/components/v2/reservations/ReservationCard";
import { ReservationsConflictPanel } from "@/components/v2/reservations/ReservationsConflictPanel";
import { ReservationsMonthCalendar } from "@/components/v2/reservations/ReservationsMonthCalendar";
import { ReservationsPlannerToolbar } from "@/components/v2/reservations/ReservationsPlannerToolbar";
import { ReservationsWeekGrid } from "@/components/v2/reservations/ReservationsWeekGrid";
import { ReservationsYearOverview } from "@/components/v2/reservations/ReservationsYearOverview";
import { cn } from "@/lib/utils/cn";

type ManualForm = {
  infrastructure_id: string;
  date: string;
  creneau: CreneauType;
  stage_id: string;
  notes: string;
};

type EditForm = {
  infrastructure_id: string;
  date: string;
  creneau: CreneauType;
  stage_id: string;
  notes: string;
};

function reservationConflictLabel(
  r: ReservationEnrichedV2,
  all: ReservationEnrichedV2[],
  terrainIds: Set<string>,
  plannerMessages: Map<string, string>
): string {
  if (plannerMessages.has(r.id)) return plannerMessages.get(r.id)!;
  if (terrainIds.has(r.id)) return conflictStageNames(r, all, terrainIds);
  return "";
}

export function ReservationsV2Client() {
  const { toast } = useToast();
  const { isAdmin } = useRole();
  const [items, setItems] = useState<ReservationEnrichedV2[]>([]);
  const [planning, setPlanning] = useState<PlanningSlotEnriched[]>([]);
  const [stages, setStages] = useState<Awaited<ReturnType<typeof getStages>>>([]);
  const [infrastructures, setInfrastructures] = useState<InfrastructureV2[]>([]);
  const [stageFilter, setStageFilter] = useState("all");
  const [creneauFilter, setCreneauFilter] = useState<CreneauType | "all">("all");
  const [periodMode, setPeriodMode] = useState<PlannerPeriodMode>("month");
  const [viewMode, setViewMode] = useState<PlannerViewMode>("list");
  const [pivotDate, setPivotDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [listDayFilter, setListDayFilter] = useState<string | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualForm, setManualForm] = useState<ManualForm>({
    infrastructure_id: "",
    date: new Date().toISOString().slice(0, 10),
    creneau: "journee",
    stage_id: "",
    notes: "",
  });
  const [editRow, setEditRow] = useState<ReservationEnrichedV2 | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [deleteRow, setDeleteRow] = useState<ReservationEnrichedV2 | null>(null);
  const [busy, setBusy] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const plannerRange = useMemo(
    () => resolvePlannerRange(periodMode, pivotDate),
    [periodMode, pivotDate]
  );

  const load = useCallback(async () => {
    const [{ reservations: r, planning: p }, s, i] = await Promise.all([
      loadReservationsPlannerAction({
        dateDebut: plannerRange?.dateDebut,
        dateFin: plannerRange?.dateFin,
        syncBeforeLoad: true,
      }),
      getStages(),
      getInfrastructures(),
    ]);
    setItems(
      dedupeReservationsForDisplay(r).filter((x) => normalizeStatut(x.statut) !== "annule")
    );
    setPlanning(p);
    setStages(s);
    setInfrastructures(i);
    if (i[0]) {
      setManualForm((f) =>
        f.infrastructure_id ? f : { ...f, infrastructure_id: i[0]!.id }
      );
    }
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
        { event: "*", schema: "public", table: "planning" },
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

  const plannerAnalysis = useMemo(
    () => analyzePlannerConflicts(items, planning),
    [items, planning]
  );

  const highlightReservationIds = useMemo(() => {
    const ids = new Set<string>();
    for (const c of plannerAnalysis.conflicts) {
      if (c.kind === "terrain_overlap" || c.kind === "terrain_programme") {
        for (const id of c.reservation_ids) ids.add(id);
      }
    }
    return ids;
  }, [plannerAnalysis.conflicts]);

  const reservationConflictMessages = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of plannerAnalysis.conflicts) {
      for (const id of c.reservation_ids) {
        if (c.kind === "terrain_overlap" || c.kind === "terrain_programme") {
          map.set(id, conflictKindLabel(c.kind));
        } else if (!map.has(id)) {
          map.set(id, conflictKindLabel(c.kind));
        }
      }
    }
    return map;
  }, [plannerAnalysis.conflicts]);

  const conflictDates = useMemo(() => {
    const s = new Set<string>();
    for (const c of plannerAnalysis.conflicts) {
      if (c.kind === "terrain_overlap" || c.kind === "terrain_programme") {
        s.add(c.date);
      }
    }
    return s;
  }, [plannerAnalysis.conflicts]);

  const conflictMonths = useMemo(() => {
    const s = new Set<string>();
    for (const c of plannerAnalysis.conflicts) {
      if (c.kind === "terrain_overlap" || c.kind === "terrain_programme") {
        s.add(c.date.slice(0, 7));
      }
    }
    return s;
  }, [plannerAnalysis.conflicts]);

  const filtered = useMemo(() => {
    return items.filter((r) => {
      if (stageFilter !== "all" && r.stage_id !== stageFilter) return false;
      if (creneauFilter !== "all" && resolveCreneauType(r) !== creneauFilter) return false;
      if (listDayFilter) {
        const key = format(parseReservationDate(r.date_debut), "yyyy-MM-dd");
        if (key !== listDayFilter) return false;
      }
      return true;
    });
  }, [items, stageFilter, creneauFilter, listDayFilter]);

  const criticalCount = useMemo(
    () =>
      plannerAnalysis.conflicts.filter(
        (c) => c.kind === "terrain_overlap" || c.kind === "terrain_programme"
      ).length,
    [plannerAnalysis.conflicts]
  );

  const kpis = useMemo(() => {
    const courts = new Set(filtered.map((r) => r.infrastructure_id)).size;
    const planningSlots = planning.length;
    return {
      reservations: filtered.length,
      courts,
      conflits: criticalCount,
      planningSlots,
    };
  }, [filtered, criticalCount, planning.length]);

  const groupedByDate = useMemo(() => {
    const map = new Map<string, ReservationEnrichedV2[]>();
    for (const r of filtered) {
      const key = format(parseReservationDate(r.date_debut), "yyyy-MM-dd");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const gridDays = useMemo(
    () => daysInPlannerRange(plannerRange, pivotDate, periodMode),
    [plannerRange, pivotDate, periodMode]
  );

  function filterSubtitle(): string {
    const parts: string[] = [];
    if (plannerRange?.label) parts.push(plannerRange.label);
    if (stageFilter !== "all") {
      parts.push(stages.find((s) => s.id === stageFilter)?.stage_action ?? "Stage");
    }
    if (creneauFilter !== "all") {
      parts.push(CRENEAU_OPTIONS.find((c) => c.value === creneauFilter)?.label ?? creneauFilter);
    }
    if (listDayFilter) parts.push(listDayFilter);
    return parts.length ? `Filtré : ${parts.join(" — ")}` : "";
  }

  function exportPdf() {
    exportReservationsPDF(filtered, filterSubtitle());
  }

  function openEdit(r: ReservationEnrichedV2) {
    const d = parseReservationDate(r.date_debut);
    setEditRow(r);
    setEditForm({
      infrastructure_id: r.infrastructure_id,
      date: format(d, "yyyy-MM-dd"),
      creneau: resolveCreneauType(r),
      stage_id: r.stage_id ?? "",
      notes: r.notes ?? "",
    });
  }

  async function saveEdit() {
    if (!editRow || !editForm) return;
    setBusy(true);
    const times = buildReservationDateTimes(editForm.date, editForm.creneau);
    const res = await updateReservationInfrastructure(editRow.id, {
      ...times,
      infrastructure_id: editForm.infrastructure_id,
      stage_id: editForm.stage_id || null,
      notes: editForm.notes.trim() || null,
      statut: editRow.statut,
    });
    setBusy(false);
    if (!res.ok) {
      toast(res.error ?? "Erreur de mise à jour", "error");
      return;
    }
    toast("Réservation mise à jour");
    setEditRow(null);
    setEditForm(null);
    await syncPlanningAfterReservationChangeAction(editForm.stage_id || editRow.stage_id);
    await load();
  }

  async function createManual() {
    if (!manualForm.infrastructure_id || !manualForm.date) {
      toast("Infrastructure et date obligatoires", "error");
      return;
    }
    setBusy(true);
    const times = buildReservationDateTimes(manualForm.date, manualForm.creneau);
    const res = await createReservationInfrastructure({
      infrastructure_id: manualForm.infrastructure_id,
      stage_id: manualForm.stage_id || null,
      entraineur_id: null,
      statut: "confirmee",
      notes: manualForm.notes.trim() || null,
      creneau: times.creneau as CreneauReservationV2,
      heure_debut: times.heure_debut,
      heure_fin: times.heure_fin,
      date_debut: times.date_debut,
      date_fin: times.date_fin,
    });
    setBusy(false);
    if (!res.data) {
      toast(res.error ?? "Erreur création", "error");
      return;
    }
    toast("Réservation créée");
    setManualOpen(false);
    await load();
  }

  async function handleDelete() {
    if (!deleteRow) return;
    setBusy(true);
    const res = await deleteReservationInfrastructure(deleteRow.id);
    setBusy(false);
    if (!res.ok) {
      toast(res.error ?? "Erreur suppression", "error");
      return;
    }
    toast("Réservation supprimée");
    const stageId = deleteRow.stage_id;
    setDeleteRow(null);
    await syncPlanningAfterReservationChangeAction(stageId);
    await load();
  }

  async function forceSyncAndReload() {
    setSyncing(true);
    try {
      const result = await fullReconcileReservationsAction();
      await load();
      const parts: string[] = [];
      if (result.planningUpserted > 0) {
        parts.push(`${result.planningUpserted} depuis le planning`);
      }
      if (result.processed > 0) parts.push(`${result.processed} stage(s) traité(s)`);
      if (result.synced > 0) parts.push(`${result.synced} avec réservations mises à jour`);
      if (result.cleaned > 0) parts.push(`${result.cleaned} doublon(s) supprimé(s)`);
      toast(
        parts.length > 0 ? parts.join(" · ") : "Réservations alignées sur les stages",
        "success"
      );
    } catch (e) {
      toast(e instanceof Error ? e.message : "Erreur de synchronisation", "error");
    } finally {
      setSyncing(false);
    }
  }

  function handlePeriodChange(mode: PlannerPeriodMode) {
    setPeriodMode(mode);
    setListDayFilter(null);
    if (mode === "week") setViewMode("week");
    else if (mode === "year") setViewMode("year");
    else if (mode === "month") setViewMode((v) => (v === "year" ? "month" : v));
  }

  function handleMonthFromYear(monthKey: string) {
    setPivotDate(`${monthKey}-01`);
    setPeriodMode("month");
    setViewMode("month");
    setListDayFilter(null);
  }

  const rangeLabel = plannerRange?.label ?? "Toutes les périodes";
  const yearNum = parseInt(pivotDate.slice(0, 4), 10) || new Date().getFullYear();

  return (
    <>
      <V2PageHeader
        title="Réservations"
        description="Terrains, planning et conflits — semaine, mois ou année"
        actions={
          <div className="flex flex-wrap gap-2">
            {isAdmin && (
              <Button
                variant="secondary"
                size="sm"
                disabled={syncing}
                onClick={() => void forceSyncAndReload()}
              >
                {syncing ? "Synchronisation…" : "Sync tous les stages"}
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={() => setManualOpen(true)}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              Réservation manuelle
            </Button>
            <Button variant="secondary" size="sm" onClick={exportPdf}>
              <FileDown className="mr-1 h-3.5 w-3.5" />
              Imprimer / PDF
            </Button>
          </div>
        }
      />

      <main className="space-y-4 p-4 sm:p-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card className="p-4 text-center">
            <div className="text-3xl font-bold text-frmt-green">{kpis.reservations}</div>
            <div className="mt-1 text-sm text-muted">
              Réservations {plannerRange ? "sur la période" : "chargées"}
            </div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-3xl font-bold">{kpis.courts}</div>
            <div className="mt-1 text-sm text-muted">Courts utilisés</div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-3xl font-bold text-sky-400">{kpis.planningSlots}</div>
            <div className="mt-1 text-sm text-muted">Séances planning</div>
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
            <div className="mt-1 text-sm text-muted">Conflits terrain ↔ programme</div>
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
          onPeriodChange={handlePeriodChange}
          onViewChange={setViewMode}
          onPivotChange={(iso) => {
            setPivotDate(iso);
            setListDayFilter(null);
          }}
          onShiftPivot={(dir) => {
            setPivotDate(shiftPlannerPivot(pivotDate, periodMode, dir));
            setListDayFilter(null);
          }}
          onStageFilter={setStageFilter}
          onCreneauFilter={setCreneauFilter}
        />

        <ReservationsConflictPanel
          reservations={items}
          planning={planning}
          onSelectDate={(d) => {
            setListDayFilter(d);
            setViewMode("list");
          }}
        />

        {listDayFilter && (
          <div className="flex items-center gap-2 text-sm">
            <span>Filtre jour : {listDayFilter}</span>
            <button
              type="button"
              className="text-frmt-green hover:underline"
              onClick={() => setListDayFilter(null)}
            >
              Effacer
            </button>
          </div>
        )}

        {viewMode === "week" && (
          <ReservationsWeekGrid
            days={periodMode === "week" ? gridDays : gridDays.slice(0, 7)}
            infrastructures={infrastructures}
            reservations={filtered}
            planning={planning}
            highlightReservationIds={highlightReservationIds}
          />
        )}

        {viewMode === "month" && plannerRange && periodMode === "month" && (
          <ReservationsMonthCalendar
            range={plannerRange}
            reservations={filtered}
            conflictDates={conflictDates}
            onDayClick={(d) => {
              setListDayFilter(d);
              setViewMode("list");
            }}
          />
        )}

        {viewMode === "year" && (
          <ReservationsYearOverview
            year={yearNum}
            reservations={filtered}
            conflictMonths={conflictMonths}
            onMonthClick={handleMonthFromYear}
          />
        )}

        {viewMode === "list" && (
          <>
            {filtered.length === 0 && (
              <Card className="border-dashed p-8 text-center text-sm text-muted">
                Aucune réservation pour ces filtres.
                <br />
                Changez la période, le mois, ou cliquez <strong>Sync tous les stages</strong>.
              </Card>
            )}

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
                      {rows.map((r) => {
                        const conflict =
                          highlightReservationIds.has(r.id) ||
                          reservationConflictMessages.has(r.id);
                        return (
                          <ReservationCard
                            key={r.id}
                            r={r}
                            conflict={conflict}
                            conflictLabel={reservationConflictLabel(
                              r,
                              items,
                              plannerAnalysis.terrainConflictIds,
                              reservationConflictMessages
                            )}
                            onEdit={() => openEdit(r)}
                            onDelete={() => setDeleteRow(r)}
                          />
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>
          </>
        )}
      </main>

      <Modal
        open={manualOpen}
        onClose={() => setManualOpen(false)}
        title="Réservation manuelle"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setManualOpen(false)}>
              Annuler
            </Button>
            <Button disabled={busy} onClick={() => void createManual()}>
              Créer la réservation
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <div>
            <Label>Infrastructure</Label>
            <select
              className="mt-1 w-full rounded border border-border bg-surface px-2 py-1.5 text-sm"
              value={manualForm.infrastructure_id}
              onChange={(e) =>
                setManualForm({ ...manualForm, infrastructure_id: e.target.value })
              }
            >
              {infrastructures.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.nom}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Date</Label>
            <Input
              type="date"
              value={manualForm.date}
              onChange={(e) => setManualForm({ ...manualForm, date: e.target.value })}
            />
          </div>
          <div>
            <Label>Créneau</Label>
            <div className="mt-2 space-y-2 text-sm">
              {CRENEAU_OPTIONS.map((o) => (
                <label key={o.value} className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={manualForm.creneau === o.value}
                    onChange={() => setManualForm({ ...manualForm, creneau: o.value })}
                  />
                  {o.emoji} {o.label}
                </label>
              ))}
            </div>
          </div>
          <div>
            <Label>Stage lié</Label>
            <select
              className="mt-1 w-full rounded border border-border bg-surface px-2 py-1.5 text-sm"
              value={manualForm.stage_id}
              onChange={(e) => setManualForm({ ...manualForm, stage_id: e.target.value })}
            >
              <option value="">Aucun</option>
              {stages.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.stage_action}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Note (optionnel)</Label>
            <Input
              value={manualForm.notes}
              onChange={(e) => setManualForm({ ...manualForm, notes: e.target.value })}
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={!!editRow && !!editForm}
        onClose={() => {
          setEditRow(null);
          setEditForm(null);
        }}
        title="Modifier la réservation"
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setEditRow(null);
                setEditForm(null);
              }}
            >
              Annuler
            </Button>
            <Button disabled={busy} onClick={() => void saveEdit()}>
              Enregistrer
            </Button>
          </div>
        }
      >
        {editForm && (
          <div className="space-y-3">
            <div>
              <Label>Infrastructure</Label>
              <select
                className="mt-1 w-full rounded border border-border bg-surface px-2 py-1.5 text-sm"
                value={editForm.infrastructure_id}
                onChange={(e) =>
                  setEditForm({ ...editForm, infrastructure_id: e.target.value })
                }
              >
                {infrastructures.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.nom}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Date</Label>
              <Input
                type="date"
                value={editForm.date}
                onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
              />
            </div>
            <div>
              <Label>Créneau</Label>
              <div className="mt-2 space-y-2 text-sm">
                {CRENEAU_OPTIONS.map((o) => (
                  <label key={o.value} className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={editForm.creneau === o.value}
                      onChange={() => setEditForm({ ...editForm, creneau: o.value })}
                    />
                    {o.emoji} {o.label}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <Label>Stage lié</Label>
              <select
                className="mt-1 w-full rounded border border-border bg-surface px-2 py-1.5 text-sm"
                value={editForm.stage_id}
                onChange={(e) => setEditForm({ ...editForm, stage_id: e.target.value })}
              >
                <option value="">Aucun</option>
                {stages.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.stage_action}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Note</Label>
              <Input
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
              />
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleteRow}
        title="Supprimer cette réservation ?"
        description="Action définitive."
        confirmLabel="Supprimer"
        loading={busy}
        onCancel={() => setDeleteRow(null)}
        onConfirm={() => void handleDelete()}
      />
    </>
  );
}
