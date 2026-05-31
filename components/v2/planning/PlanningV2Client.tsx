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
import { deleteSeance, getInfrastructures, getPlanning, getStages } from "@/lib/supabase/queries";
import { exportPlanningPDF } from "@/lib/pdf/pdf-exports";
import type { InfrastructureV2, PlanningSeanceV2 } from "@/lib/types/v2";
import { CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type Creneau = "matin" | "apres_midi";

function slotForHeure(h: string): Creneau {
  const hour = parseInt(h.split(":")[0] ?? "12", 10);
  return hour < 13 ? "matin" : "apres_midi";
}

export function PlanningV2Client() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const stageFromUrl = searchParams.get("stage") ?? "";
  const [items, setItems] = useState<PlanningSeanceV2[]>([]);
  const [infrastructures, setInfrastructures] = useState<InfrastructureV2[]>([]);
  const [stageNames, setStageNames] = useState<Record<string, string>>({});
  const [stageFilter, setStageFilter] = useState(stageFromUrl);
  const [weekOffset, setWeekOffset] = useState(0);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(true);

  const load = useCallback(async () => {
    const [p, s, infra] = await Promise.all([getPlanning(), getStages(), getInfrastructures()]);
    setItems(p);
    setInfrastructures(infra.slice(0, 5));
    setStageNames(Object.fromEntries(s.map((x) => [x.id, x.stage_action])));
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
        const { created } = await syncAllStagesPlanningAction();
        if (created > 0) {
          toast(`${created} séance(s) synchronisée(s) depuis les stages`, "success");
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

  const grid = useMemo(() => {
    const courts = infrastructures.length
      ? infrastructures
      : [{ id: "c1", nom: "Court 1" }, { id: "c2", nom: "Court 2" }, { id: "c3", nom: "Court 3" }];
    const creneaux: Creneau[] = ["matin", "apres_midi"];
    const cells: Record<string, string> = {};

    for (const seance of items) {
      if (stageFilter && seance.stage_id !== stageFilter) continue;
      if (!weekDates.includes(seance.date)) continue;
      const slot = slotForHeure(seance.heure_debut);
      const courtId = seance.infrastructure_id ?? courts[0]?.id ?? "default";
      const key = `${seance.date}|${courtId}|${slot}`;
      const label = stageNames[seance.stage_id] ?? "Séance";
      cells[key] = cells[key] ? `${cells[key]}, ${label}` : label;
    }

    return { courts, creneaux, cells };
  }, [items, infrastructures, stageFilter, weekDates, stageNames]);

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
        description={
          syncing ?
            "Synchronisation avec les stages…"
          : stageFilter && stageNames[stageFilter] ?
            `Stage : ${stageNames[stageFilter]} · ${weekLabel}`
          : weekLabel
        }
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

        {items.length === 0 ? (
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
                        {slot === "matin" ? "MATIN 09-13h" : "APM 14-18h"}
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
                {items
                  .filter((r) => !stageFilter || r.stage_id === stageFilter)
                  .slice(0, 30)
                  .map((r) => (
                    <div key={r.id} className="flex items-center justify-between rounded border border-[var(--border)] p-2 text-sm">
                      <span>
                        <strong>{r.date}</strong> {r.heure_debut}-{r.heure_fin} · {stageNames[r.stage_id] ?? "Stage"}
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
