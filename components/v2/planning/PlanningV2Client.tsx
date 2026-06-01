"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { addDays, format, parseISO, startOfWeek } from "date-fns";
import { fr } from "date-fns/locale";
import { V2PageHeader } from "@/components/v2/V2PageHeader";
import { V2PageActions } from "@/components/v2/V2PageActions";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Input";
import { EmptyState } from "@/components/v2/ui/EmptyState";
import { ConfirmDialog } from "@/components/v2/ui/ConfirmDialog";
import { useToast } from "@/components/v2/ui/ToastProvider";
import { syncAllStagesPlanningAction } from "@/lib/actions/stage-planning-actions";
import {
  createSeance,
  deleteSeance,
  getInfrastructures,
  getPlanning,
  getPlanningByStage,
  getStages,
} from "@/lib/supabase/queries";
import { exportPlanningPDF } from "@/lib/pdf/pdf-exports";
import type { InfrastructureV2, PlanningSeanceV2, StageProgrammeV2 } from "@/lib/types/v2";
import { CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { eachDayOfStage } from "@/lib/v2/stage-calculations";

type Creneau = "matin" | "apres_midi";
type StageViewMode = "prevus" | "tous";
type StageMeta = Pick<StageProgrammeV2, "id" | "stage_action" | "statut" | "date_debut" | "date_fin" | "categorie">;

function slotForHeure(h: string): Creneau {
  const hour = parseInt(h.split(":")[0] ?? "12", 10);
  return hour < 13 ? "matin" : "apres_midi";
}

function slotLabel(slot: Creneau): string {
  return slot === "matin" ? "Matin (09:00-13:00)" : "Après-midi (14:00-18:00)";
}

async function ensurePlanningFromStagesClient(stages: StageProgrammeV2[]): Promise<number> {
  let created = 0;
  for (const stage of stages) {
    if (stage.statut === "annule") continue;
    const existing = await getPlanningByStage(stage.id);
    if (existing.length > 0) continue;
    const days = eachDayOfStage(stage.date_debut, stage.date_fin);
    for (const day of days) {
      const res = await createSeance({
        stage_id: stage.id,
        date: day,
        heure_debut: "09:00",
        heure_fin: "13:00",
        infrastructure_id: null,
        surface: null,
        coach_id: null,
        groupe: stage.categorie ?? null,
        statut: "prevu",
      });
      if (!res.error && res.data) created++;
    }
  }
  return created;
}

export function PlanningV2Client() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const stageFromUrl = searchParams.get("stage") ?? "";
  const [items, setItems] = useState<PlanningSeanceV2[]>([]);
  const [infrastructures, setInfrastructures] = useState<InfrastructureV2[]>([]);
  const [stageNames, setStageNames] = useState<Record<string, string>>({});
  const [stageMeta, setStageMeta] = useState<Record<string, StageMeta>>({});
  const [stageFilter, setStageFilter] = useState(stageFromUrl);
  const [viewMode, setViewMode] = useState<StageViewMode>("tous");
  const [weekOffset, setWeekOffset] = useState(0);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(true);

  const load = useCallback(async () => {
    const [p, s, infra] = await Promise.all([getPlanning(), getStages(), getInfrastructures()]);
    setItems(p);
    setInfrastructures(infra.slice(0, 5));
    setStageNames(Object.fromEntries(s.map((x) => [x.id, x.stage_action])));
    setStageMeta(
      Object.fromEntries(
        s.map((x) => [
          x.id,
          {
            id: x.id,
            stage_action: x.stage_action,
            statut: x.statut,
            date_debut: x.date_debut,
            date_fin: x.date_fin,
            categorie: x.categorie,
          } satisfies StageMeta,
        ])
      )
    );
  }, []);

  useEffect(() => {
    setStageFilter(stageFromUrl);
  }, [stageFromUrl]);

  useEffect(() => {
    if (!stageFromUrl || items.length === 0) return;
    const first = items.find((s) => s.stage_id === stageFromUrl);
    if (!first?.date) return;
    const d = parseISO(first.date);
    if (Number.isNaN(d.getTime())) return;
    const base = startOfWeek(new Date(), { weekStartsOn: 1 });
    const target = startOfWeek(d, { weekStartsOn: 1 });
    const msPerWeek = 7 * 24 * 60 * 60 * 1000;
    setWeekOffset(Math.round((target.getTime() - base.getTime()) / msPerWeek));
  }, [stageFromUrl, items]);

  useEffect(() => {
    (async () => {
      setSyncing(true);
      try {
        let created = 0;
        try {
          const serverSync = await syncAllStagesPlanningAction();
          created += serverSync.created;
        } catch {
          // fallback client below
        }

        const currentStages = await getStages();
        created += await ensurePlanningFromStagesClient(currentStages);

        if (created > 0) {
          toast(`${created} séance(s) créées/synchronisées depuis les stages`, "success");
        }
      } catch {
        /* sync best-effort */
      } finally {
        setSyncing(false);
        await load();
      }
    })();
  }, [load]);

  const weekStart = useMemo(() => {
    const base = startOfWeek(new Date(), { weekStartsOn: 1 });
    base.setDate(base.getDate() + weekOffset * 7);
    return base;
  }, [weekOffset]);

  const weekLabel = `Semaine du ${format(weekStart, "dd/MM", { locale: fr })}`;

  const weekDates = useMemo(
    () => Array.from({ length: 5 }, (_, i) => format(addDays(weekStart, i), "yyyy-MM-dd")),
    [weekStart]
  );

  const scopedItems = useMemo(() => {
    return items.filter((seance) => {
      if (stageFilter && seance.stage_id !== stageFilter) return false;
      if (viewMode === "tous") return true;
      const statut = String(stageMeta[seance.stage_id]?.statut ?? "").toLowerCase();
      // Focus pro: on met en avant les stages à planifier / à exécuter.
      return statut === "prevu" || statut === "confirme";
    });
  }, [items, stageFilter, viewMode, stageMeta]);

  const weekItems = useMemo(() => {
    return scopedItems
      .filter((s) => weekDates.includes(s.date))
      .sort((a, b) => {
        const k1 = `${a.date}|${a.heure_debut}|${a.infrastructure_id ?? ""}`;
        const k2 = `${b.date}|${b.heure_debut}|${b.infrastructure_id ?? ""}`;
        return k1.localeCompare(k2);
      });
  }, [scopedItems, weekDates]);

  const grid = useMemo(() => {
    const courts = infrastructures.length
      ? infrastructures
      : [{ id: "c1", nom: "Court 1" }, { id: "c2", nom: "Court 2" }, { id: "c3", nom: "Court 3" }];
    const creneaux: Creneau[] = ["matin", "apres_midi"];
    const cells: Record<string, string> = {};

    for (const seance of weekItems) {
      const slot = slotForHeure(seance.heure_debut);
      const courtId = seance.infrastructure_id ?? courts[0]?.id ?? "default";
      const key = `${seance.date}|${courtId}|${slot}`;
      const label = stageNames[seance.stage_id] ?? "Séance";
      cells[key] = cells[key] ? `${cells[key]}, ${label}` : label;
    }

    return { courts, creneaux, cells };
  }, [weekItems, infrastructures, weekDates, stageNames]);

  const weekSummary = useMemo(() => {
    const uniqueStages = new Set(weekItems.map((s) => s.stage_id)).size;
    const matin = weekItems.filter((s) => slotForHeure(s.heure_debut) === "matin").length;
    const apm = weekItems.length - matin;
    return { total: weekItems.length, uniqueStages, matin, apm };
  }, [weekItems]);

  async function confirmDelete() {
    if (!deleteId) return;
    await deleteSeance(deleteId);
    toast("Séance supprimée");
    setDeleteId(null);
    await load();
  }

  return (
    <>
      <V2PageHeader
        title="Planning des séances"
        description={syncing ? "Synchronisation avec les stages…" : `Vue auto planning · ${weekLabel}`}
        actions={
          <V2PageActions
            onExportPdf={() =>
              exportPlanningPDF(
                items.map((r) => ({
                  date: r.date,
                  heure_debut: r.heure_debut,
                  heure_fin: r.heure_fin,
                  court: r.infrastructure_id ?? "—",
                  surface: r.surface ?? "—",
                  coach: r.coach_id ?? "—",
                  groupe: r.groupe ?? "—",
                  statut: r.statut,
                  stage: stageNames[r.stage_id],
                })),
                weekLabel
              )
            }
          />
        }
      />
      <main className="space-y-4 p-4 sm:p-6">
        <Card className="flex flex-wrap items-center gap-3 p-4">
          <Select value={stageFilter} onChange={(e) => setStageFilter(e.target.value)} className="max-w-xs">
            <option value="">Tous les stages</option>
            {Object.entries(stageNames).map(([id, nom]) => (
              <option key={id} value={id}>
                {nom}
              </option>
            ))}
          </Select>
          <Select value={viewMode} onChange={(e) => setViewMode(e.target.value as StageViewMode)} className="max-w-xs">
            <option value="prevus">Stages prévus/confirmés</option>
            <option value="tous">Tous les statuts</option>
          </Select>
          {stageFilter && (
            <>
              <Link
                href={`/v2/stages/${stageFilter}`}
                className="text-sm text-[#3498db] underline-offset-2 hover:underline"
              >
                Fiche stage →
              </Link>
              <Link
                href={`/v2/calendrier?stage=${stageFilter}`}
                className="text-sm text-frmt-green underline-offset-2 hover:underline"
              >
                Calendrier →
              </Link>
            </>
          )}
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setWeekOffset((w) => w - 1)}>
              ← Semaine préc.
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setWeekOffset(0)}>
              Aujourd&apos;hui
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setWeekOffset((w) => w + 1)}>
              Semaine suiv. →
            </Button>
          </div>
        </Card>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Card className="p-3">
            <p className="text-xs text-muted">Séances semaine</p>
            <p className="text-xl font-semibold">{weekSummary.total}</p>
          </Card>
          <Card className="p-3">
            <p className="text-xs text-muted">Stages actifs</p>
            <p className="text-xl font-semibold">{weekSummary.uniqueStages}</p>
          </Card>
          <Card className="p-3">
            <p className="text-xs text-muted">Créneaux matin</p>
            <p className="text-xl font-semibold">{weekSummary.matin}</p>
          </Card>
          <Card className="p-3">
            <p className="text-xs text-muted">Créneaux après-midi</p>
            <p className="text-xl font-semibold">{weekSummary.apm}</p>
          </Card>
        </div>

        {scopedItems.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="Aucune séance planifiée"
            description="Les séances sont créées automatiquement avec les stages."
          />
        ) : (
          <>
            <Card className="overflow-x-auto p-0">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--bg-card-hover)] text-xs uppercase tracking-wider text-[var(--text-secondary)]">
                    <th className="p-3 text-left">Créneau</th>
                    {grid.courts.map((c) => (
                      <th key={c.id} className="p-3 text-left">
                        {c.nom}
                        {(c as InfrastructureV2).surface ? ` ${(c as InfrastructureV2).surface}` : ""}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {grid.creneaux.map((slot) => (
                    <tr key={slot} className="border-b border-[var(--border)]">
                      <td className="p-3 font-medium text-[var(--text-secondary)]">
                        {slotLabel(slot)}
                      </td>
                      {grid.courts.map((c) => {
                        const dayCells = weekDates
                          .map((d) => grid.cells[`${d}|${c.id}|${slot}`])
                          .filter(Boolean);
                        const text = dayCells.length ? dayCells.join(" · ") : "—";
                        return (
                          <td
                            key={c.id}
                            className={cn(
                              "p-3 align-top",
                              dayCells.length ? "bg-[#0d2137]/50 text-[#3498db]" : "text-[var(--text-muted)]"
                            )}
                          >
                            {text}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>

            <Card className="p-4">
              <h3 className="mb-3 text-xs uppercase tracking-wider text-[var(--text-muted)]">Liste séances</h3>
              <div className="space-y-2">
                {weekItems
                  .slice(0, 30)
                  .map((r) => (
                    <div key={r.id} className="flex items-center justify-between rounded border border-[var(--border)] p-2 text-sm">
                      <span>
                        <strong>{r.date}</strong> {r.heure_debut}-{r.heure_fin} · {stageNames[r.stage_id] ?? "Stage"} ·{" "}
                        {r.infrastructure_id ?? "Terrain non défini"}
                      </span>
                      <Button variant="danger" size="sm" onClick={() => setDeleteId(r.id)}>
                        Suppr.
                      </Button>
                    </div>
                  ))}
              </div>
            </Card>
          </>
        )}
      </main>

      <ConfirmDialog
        open={!!deleteId}
        title="Supprimer cette séance ?"
        description="Cette action est irréversible."
        confirmLabel="Supprimer définitivement"
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleteId(null)}
      />
    </>
  );
}
