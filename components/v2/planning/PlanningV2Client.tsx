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
import { useToast } from "@/components/v2/ui/ToastProvider";
import { getStages } from "@/lib/supabase/queries";
import { exportPlanningPDF } from "@/lib/pdf/pdf-exports";
import type { StageProgrammeV2 } from "@/lib/types/v2";
import { CalendarDays } from "lucide-react";

type Creneau = "matin" | "apres_midi";
type StageStatusFilter = "prevus_confirmes" | "en_cours" | "tous";
type PlanningSession = {
  id: string;
  stageId: string;
  stageName: string;
  categorie: string;
  date: string;
  creneau: Creneau;
  heure_debut: string;
  heure_fin: string;
  nombre_joueurs: number;
  nombre_coachs: number;
  statut: string;
};

function stageStatus(raw: unknown): string {
  return String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

function parseDateSafe(value: unknown): Date | null {
  if (!value) return null;
  const raw = String(value);
  const normalized = raw.includes("T") ? raw : `${raw}T12:00:00`;
  const parsed = parseISO(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function pickStageDate(stage: StageProgrammeV2, kind: "start" | "end"): Date | null {
  const dynamicStage = stage as unknown as Record<string, unknown>;
  const keys =
    kind === "start" ?
      ["date_debut", "start_date", "dateDebut", "startDate"]
    : ["date_fin", "end_date", "dateFin", "endDate"];

  for (const key of keys) {
    const parsed = parseDateSafe(dynamicStage[key]);
    if (parsed) return parsed;
  }
  return null;
}

function slotLabel(slot: Creneau): string {
  return slot === "matin" ? "Matin (09:00-11:00)" : "Après-midi (15:00-17:00)";
}

function shouldIncludeStageStatus(status: string): boolean {
  return status === "prevu" || status === "confirme" || status === "en_cours";
}

export function generatePlanningSessionsFromStages(
  stages: StageProgrammeV2[],
  selectedWeekStart: Date
): PlanningSession[] {
  const weekStart = startOfWeek(selectedWeekStart, { weekStartsOn: 1 });
  const weekEnd = addDays(weekStart, 6);
  const out: PlanningSession[] = [];

  for (const stage of stages) {
    const statut = stageStatus(stage.statut);
    if (!shouldIncludeStageStatus(statut)) continue;

    const start = pickStageDate(stage, "start");
    const end = pickStageDate(stage, "end");
    if (!start || !end) continue;

    const current = new Date(start);
    while (current <= end) {
      if (current >= weekStart && current <= weekEnd) {
        const day = format(current, "yyyy-MM-dd");
        out.push({
          id: `${stage.id}-${day}-matin`,
          stageId: stage.id,
          stageName: stage.stage_action ?? "Stage",
          categorie: stage.categorie ?? "—",
          date: day,
          creneau: "matin",
          heure_debut: "09:00",
          heure_fin: "11:00",
          nombre_joueurs: Number(stage.nombre_joueurs ?? 0),
          nombre_coachs: Number(stage.nombre_encadrants ?? 0),
          statut,
        });
        out.push({
          id: `${stage.id}-${day}-apres_midi`,
          stageId: stage.id,
          stageName: stage.stage_action ?? "Stage",
          categorie: stage.categorie ?? "—",
          date: day,
          creneau: "apres_midi",
          heure_debut: "15:00",
          heure_fin: "17:00",
          nombre_joueurs: Number(stage.nombre_joueurs ?? 0),
          nombre_coachs: Number(stage.nombre_encadrants ?? 0),
          statut,
        });
      }
      current.setDate(current.getDate() + 1);
    }
  }

  return out.sort((a, b) => {
    const k1 = `${a.date}|${a.creneau}|${a.stageName}`;
    const k2 = `${b.date}|${b.creneau}|${b.stageName}`;
    return k1.localeCompare(k2);
  });
}

export function PlanningV2Client() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const stageFromUrl = searchParams.get("stage") ?? "";
  const [stages, setStages] = useState<StageProgrammeV2[]>([]);
  const [stageFilter, setStageFilter] = useState(stageFromUrl);
  const [statusFilter, setStatusFilter] = useState<StageStatusFilter>("tous");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [weekOffset, setWeekOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const isDev = process.env.NODE_ENV !== "production";

  const load = useCallback(async () => {
    setLoading(true);
    const s = await getStages();
    setStages(s);
    if (isDev) {
      console.info("[PlanningV2] stages loaded:", s.length);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    setStageFilter(stageFromUrl);
  }, [stageFromUrl]);

  useEffect(() => {
    (async () => {
      await load();
    })();
  }, [load]);

  const weekStart = useMemo(() => {
    const base = startOfWeek(new Date(), { weekStartsOn: 1 });
    base.setDate(base.getDate() + weekOffset * 7);
    return base;
  }, [weekOffset]);

  const weekLabel = `Semaine du ${format(weekStart, "dd/MM", { locale: fr })}`;

  const generatedSessions = useMemo(() => generatePlanningSessionsFromStages(stages, weekStart), [stages, weekStart]);

  const stageById = useMemo(
    () => Object.fromEntries(stages.map((s) => [s.id, s])),
    [stages]
  );

  const categories = useMemo(() => {
    return [...new Set(stages.map((s) => s.categorie).filter(Boolean))].sort();
  }, [stages]);

  useEffect(() => {
    if (!stageFromUrl) return;
    const stage = stageById[stageFromUrl];
    if (!stage) return;
    const start = pickStageDate(stage, "start");
    if (!start) return;
    const base = startOfWeek(new Date(), { weekStartsOn: 1 });
    const target = startOfWeek(start, { weekStartsOn: 1 });
    const msPerWeek = 7 * 24 * 60 * 60 * 1000;
    setWeekOffset(Math.round((target.getTime() - base.getTime()) / msPerWeek));
  }, [stageById, stageFromUrl]);

  const filteredSessions = useMemo(() => {
    return generatedSessions.filter((session) => {
      if (stageFilter && session.stageId !== stageFilter) return false;
      if (categoryFilter !== "all" && session.categorie !== categoryFilter) return false;
      if (statusFilter === "en_cours") return stageStatus(session.statut) === "en_cours";
      if (statusFilter === "prevus_confirmes") {
        const s = stageStatus(session.statut);
        return s === "prevu" || s === "confirme";
      }
      return true;
    });
  }, [generatedSessions, stageFilter, categoryFilter, statusFilter]);

  const weekSummary = useMemo(() => {
    const uniqueStages = new Set(filteredSessions.map((s) => s.stageId)).size;
    const matin = filteredSessions.filter((s) => s.creneau === "matin").length;
    const apm = filteredSessions.filter((s) => s.creneau === "apres_midi").length;
    return { total: filteredSessions.length, uniqueStages, matin, apm };
  }, [filteredSessions]);

  return (
    <>
      <V2PageHeader
        title="Planning des séances"
        description={loading ? "Chargement des stages…" : `Planning auto depuis stages · ${weekLabel}`}
        actions={
          <V2PageActions
            onExportPdf={() =>
              exportPlanningPDF(
                filteredSessions.map((r) => ({
                  date: r.date,
                  heure_debut: r.heure_debut,
                  heure_fin: r.heure_fin,
                  court: slotLabel(r.creneau),
                  surface: r.categorie,
                  coach: String(r.nombre_coachs),
                  groupe: `${r.categorie} (${r.nombre_joueurs} joueurs)`,
                  statut: r.statut,
                  stage: r.stageName,
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
            {stages.map((s) => (
              <option key={s.id} value={s.id}>
                {s.stage_action}
              </option>
            ))}
          </Select>
          <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="max-w-xs">
            <option value="all">Toutes catégories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StageStatusFilter)} className="max-w-xs">
            <option value="prevus_confirmes">Stages prévus/confirmés</option>
            <option value="en_cours">En cours</option>
            <option value="tous">Tous</option>
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

        {filteredSessions.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="Aucune séance planifiée"
            description="Aucune séance générée pour cette semaine avec les filtres actuels."
          />
        ) : (
          <Card className="p-4">
            <h3 className="mb-3 text-xs uppercase tracking-wider text-[var(--text-muted)]">Séances générées automatiquement</h3>
            <div className="space-y-2">
              {filteredSessions.map((s) => (
                <div key={s.id} className="rounded border border-[var(--border)] p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold">{s.stageName}</p>
                    <p className="text-xs text-muted">{s.date} · {slotLabel(s.creneau)}</p>
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    Catégorie: {s.categorie} · Joueurs: {s.nombre_joueurs} · Coachs: {s.nombre_coachs} · Statut: {s.statut}
                  </p>
                  <div className="mt-2 flex gap-3 text-xs">
                    <Link href={`/v2/stages/${s.stageId}`} className="text-[#3498db] underline-offset-2 hover:underline">
                      Fiche stage →
                    </Link>
                    <Link href={`/v2/calendrier?stage=${s.stageId}`} className="text-frmt-green underline-offset-2 hover:underline">
                      Calendrier →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </main>
    </>
  );
}
