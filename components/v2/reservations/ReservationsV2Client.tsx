"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useRole } from "@/lib/hooks/useRole";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { fr } from "date-fns/locale";
import { FileDown, Pencil, Plus, Trash2 } from "lucide-react";
import { V2PageHeader } from "@/components/v2/V2PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Label } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/v2/ui/ConfirmDialog";
import { useToast } from "@/components/v2/ui/ToastProvider";
import { exportReservationsPDF } from "@/lib/pdf/pdf-exports";
import { syncPlanningAfterReservationChangeAction } from "@/lib/actions/reservation-planning-sync";
import { reconcileStageTerrainReservationsAction } from "@/lib/actions/reservations-sync-actions";
import {
  createReservationInfrastructure,
  deleteReservationInfrastructure,
  getInfrastructures,
  getReservationsEnriched,
  getStages,
  updateReservationInfrastructure,
} from "@/lib/supabase/queries";
import type { CreneauReservationV2, InfrastructureV2, ReservationEnrichedV2 } from "@/lib/types/v2";
import {
  CRENEAU_OPTIONS,
  buildReservationDateTimes,
  conflictStageNames,
  dedupeReservationsForDisplay,
  detectConflicts,
  formatDateHeader,
  getCreneauInfoForReservation,
  infraLine,
  loadRangeForReservations,
  matchPeriode,
  normalizeStatut,
  parseReservationDate,
  resolveCreneauType,
  type CreneauType,
  type PeriodeFilter,
} from "@/lib/v2/reservations-utils";
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

const PERIODE_OPTIONS: { value: PeriodeFilter; label: string }[] = [
  { value: "week", label: "Cette semaine" },
  { value: "month", label: "Ce mois" },
  { value: "next_month", label: "Mois prochain" },
  { value: "all", label: "Tout" },
];

function stageLine(r: ReservationEnrichedV2): string {
  return r.stage_nom ? `📋 ${r.stage_nom}` : "📋 —";
}

export function ReservationsV2Client() {
  const { toast } = useToast();
  const { isAdmin } = useRole();
  const [items, setItems] = useState<ReservationEnrichedV2[]>([]);
  const [stages, setStages] = useState<Awaited<ReturnType<typeof getStages>>>([]);
  const [infrastructures, setInfrastructures] = useState<InfrastructureV2[]>([]);
  const [stageFilter, setStageFilter] = useState("all");
  const [creneauFilter, setCreneauFilter] = useState<CreneauType | "all">("all");
  const [periodeFilter, setPeriodeFilter] = useState<PeriodeFilter>("month");
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
  const load = useCallback(async () => {
    const range = loadRangeForReservations(periodeFilter);
    const [r, s, i] = await Promise.all([
      getReservationsEnriched(range),
      getStages(),
      getInfrastructures(),
    ]);
    setItems(
      dedupeReservationsForDisplay(r).filter((x) => normalizeStatut(x.statut) !== "annule")
    );
    setStages(s);
    setInfrastructures(i);
    if (i[0]) {
      setManualForm((f) =>
        f.infrastructure_id ? f : { ...f, infrastructure_id: i[0]!.id }
      );
    }
  }, [periodeFilter]);

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
        () => {
          void load();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "stages_programme" },
        () => {
          void load();
        }
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [load]);

  const conflictIds = useMemo(() => detectConflicts(items), [items]);

  const filtered = useMemo(() => {
    return items.filter((r) => {
      if (stageFilter !== "all" && r.stage_id !== stageFilter) return false;
      if (creneauFilter !== "all" && resolveCreneauType(r) !== creneauFilter) return false;
      if (!matchPeriode(r.date_debut, periodeFilter)) return false;
      return true;
    });
  }, [items, stageFilter, creneauFilter, periodeFilter]);

  const kpis = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const ceMois = items.filter((r) => {
      const d = parseReservationDate(r.date_debut);
      return d >= monthStart && d <= monthEnd;
    }).length;
    const courts = new Set(filtered.map((r) => r.infrastructure_id)).size;
    const conflitsInView = [...conflictIds].filter((id) => filtered.some((r) => r.id === id)).length;
    return { ceMois, courts, conflits: conflitsInView };
  }, [items, filtered, conflictIds]);

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
    if (stageFilter !== "all") {
      parts.push(stages.find((s) => s.id === stageFilter)?.stage_action ?? "Stage");
    }
    if (creneauFilter !== "all") {
      parts.push(CRENEAU_OPTIONS.find((c) => c.value === creneauFilter)?.label ?? creneauFilter);
    }
    const p = PERIODE_OPTIONS.find((o) => o.value === periodeFilter)?.label;
    if (p && periodeFilter !== "all") parts.push(p);
    return parts.length ? `Filtré par : ${parts.join(" — ")}` : "";
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
      const result = await reconcileStageTerrainReservationsAction();
      const range = loadRangeForReservations(periodeFilter);
      const [r, s, i] = await Promise.all([
        getReservationsEnriched(range),
        getStages(),
        getInfrastructures(),
      ]);
      setItems(
      dedupeReservationsForDisplay(r).filter((x) => normalizeStatut(x.statut) !== "annule")
    );
      setStages(s);
      setInfrastructures(i);
      const parts: string[] = [];
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

  return (
    <>
      <V2PageHeader
        title="Réservations"
        description="Planning terrains — créneaux Matin, Après-midi, Journée complète"
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
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Card className="p-4 text-center">
            <div className="text-3xl font-bold text-frmt-green">{kpis.ceMois}</div>
            <div className="mt-1 text-sm text-muted">Réservations ce mois</div>
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
            <div className="mt-1 text-sm text-muted">Conflits détectés</div>
          </Card>
        </div>

        <Card className="flex flex-wrap items-center gap-2 p-3">
          <select
            className="rounded-md border border-border bg-surface px-2 py-1.5 text-sm"
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
          >
            <option value="all">Tous les stages</option>
            {stages.map((s) => (
              <option key={s.id} value={s.id}>
                {s.stage_action}
              </option>
            ))}
          </select>
          <select
            className="rounded-md border border-border bg-surface px-2 py-1.5 text-sm"
            value={creneauFilter}
            onChange={(e) => setCreneauFilter(e.target.value as CreneauType | "all")}
          >
            <option value="all">Tous créneaux</option>
            {CRENEAU_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <select
            className="rounded-md border border-border bg-surface px-2 py-1.5 text-sm"
            value={periodeFilter}
            onChange={(e) => setPeriodeFilter(e.target.value as PeriodeFilter)}
          >
            {PERIODE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Card>

        {filtered.length === 0 && (
          <Card className="border-dashed p-8 text-center text-sm text-muted">
            Aucune réservation pour ces filtres.
            <br />
            Essayez le filtre <strong>Tout</strong> ou cliquez <strong>Sync stages</strong> en haut à droite.
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
                  {rows.map((r) => (
                    <ReservationCard
                      key={r.id}
                      r={r}
                      conflict={conflictIds.has(r.id)}
                      conflictLabel={conflictStageNames(r, items, conflictIds)}
                      onEdit={() => openEdit(r)}
                      onDelete={() => setDeleteRow(r)}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
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

function ReservationCard({
  r,
  conflict,
  conflictLabel,
  onEdit,
  onDelete,
}: {
  r: ReservationEnrichedV2;
  conflict: boolean;
  conflictLabel: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const c = getCreneauInfoForReservation(r);

  return (
    <Card
      className={cn(
        "relative p-4",
        conflict && "border-red-500 ring-1 ring-red-500/50"
      )}
    >
      {conflict && (
        <div className="mb-2 flex items-center gap-2 rounded-md border border-[#7b1a1a] bg-[#2d0d0d] px-3 py-1.5 text-[11px] font-medium text-[#fc8181]">
          <span aria-hidden>⚠</span>
          Conflit réel — même terrain, même horaire, stages différents
          {conflictLabel ? ` (${conflictLabel})` : ""}
        </div>
      )}
      <p className="text-sm font-medium capitalize">📅 {formatDateHeader(r.date_debut)}</p>
      <hr className="my-2 border-border/60" />
      <p className="text-sm">{infraLine(r)}</p>
      <p className="mt-1 text-sm">
        {c.emoji} {c.label} &nbsp; {c.heureDebut} → {c.heureFin}
      </p>
      <p className="mt-1 text-sm text-muted">{stageLine(r)}</p>
      <div className="absolute bottom-2 right-2 flex gap-1 opacity-70 hover:opacity-100">
        <button
          type="button"
          onClick={onEdit}
          className="rounded p-1 text-muted hover:bg-surface-elevated hover:text-foreground"
          aria-label="Modifier"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="rounded p-1 text-muted hover:bg-red-500/10 hover:text-red-500"
          aria-label="Supprimer"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </Card>
  );
}
