"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { addDays, endOfWeek, format, parseISO, startOfWeek } from "date-fns";
import { fr } from "date-fns/locale";
import { V2PageHeader } from "@/components/v2/V2PageHeader";
import { V2PageActions } from "@/components/v2/V2PageActions";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Input";
import { EmptyState } from "@/components/v2/ui/EmptyState";
import { getPlanning, getStages } from "@/lib/supabase/queries";
import { exportPlanningPDF } from "@/lib/pdf/pdf-exports";
import type { StageProgrammeV2 } from "@/lib/types/v2";
import {
  buildPlanningSessionsForWeek,
  formatPlanningSlotLabel,
  type PlanningCreneauSlot,
  type PlanningSessionRow,
} from "@/lib/v2/planning-creneaux";
import { StatusBadge } from "@/components/v2/ui/StatusBadge";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  Activity,
  BadgeCheck,
  CalendarDays,
  Clock3,
  Sun,
  Users,
  UserSquare2,
} from "lucide-react";

type StageStatusFilter = "prevus_confirmes" | "en_cours" | "tous";
type PlanningSession = PlanningSessionRow;

function normalizeStageStatus(raw: unknown): string {
  return String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace("confirmé", "confirme")
    .replace("confirmée", "confirme")
    .replace("en cours", "en_cours");
}

function normalizeStageCategory(raw: unknown): string {
  const value = String(raw ?? "").trim();
  const lower = value.toLowerCase();
  if (lower === "senior" || lower === "seniors") return "Élite Pro";
  return value || "—";
}

function formatDateFr(value: string): string {
  const d = parseISO(value.includes("T") ? value : `${value}T12:00:00`);
  return Number.isNaN(d.getTime()) ? value : format(d, "dd/MM/yyyy", { locale: fr });
}

function formatWeekRange(weekStart: Date): string {
  const end = endOfWeek(weekStart, { weekStartsOn: 1 });
  return `Semaine du ${format(weekStart, "dd/MM/yyyy", { locale: fr })} au ${format(end, "dd/MM/yyyy", { locale: fr })}`;
}

function yesNo(v: boolean): string {
  return v ? "Oui" : "Non";
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

export function generatePlanningSessionsFromStages(
  stages: StageProgrammeV2[],
  planningRows: Awaited<ReturnType<typeof getPlanning>>,
  selectedWeekStart: Date
): PlanningSession[] {
  return buildPlanningSessionsForWeek(stages, planningRows, selectedWeekStart);
}

export function PlanningV2Client() {
  const router = useRouter();
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const stageFromUrl = searchParams.get("stage") ?? "";
  const [stages, setStages] = useState<StageProgrammeV2[]>([]);
  const [planningRows, setPlanningRows] = useState<Awaited<ReturnType<typeof getPlanning>>>([]);
  const [stageFilter, setStageFilter] = useState(stageFromUrl);
  const [statusFilter, setStatusFilter] = useState<StageStatusFilter>("tous");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [weekOffset, setWeekOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const isDev = process.env.NODE_ENV !== "production";

  const load = useCallback(async () => {
    setLoading(true);
    const [s, p] = await Promise.all([getStages(), getPlanning()]);
    setStages(s);
    setPlanningRows(p);
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

  const weekLabel = formatWeekRange(weekStart);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const generatedSessions = useMemo(
    () => generatePlanningSessionsFromStages(stages, planningRows, weekStart),
    [stages, planningRows, weekStart]
  );

  const stageById = useMemo(
    () => Object.fromEntries(stages.map((s) => [s.id, s])),
    [stages]
  );

  const categories = useMemo(() => {
    return [...new Set(stages.map((s) => normalizeStageCategory(s.categorie)).filter(Boolean))].sort();
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
      if (statusFilter === "en_cours") return normalizeStageStatus(session.statut) === "en_cours";
      if (statusFilter === "prevus_confirmes") {
        const s = normalizeStageStatus(session.statut);
        return s === "prevu" || s === "confirme";
      }
      return true;
    });
  }, [generatedSessions, stageFilter, categoryFilter, statusFilter]);

  const sessionsByDaySlot = useMemo(() => {
    const map = new Map<string, PlanningSession[]>();
    for (const s of filteredSessions) {
      const key = `${s.date}|${s.creneau}`;
      const list = map.get(key) ?? [];
      list.push(s);
      map.set(key, list);
    }
    return map;
  }, [filteredSessions]);

  const weekSummary = useMemo(() => {
    const uniqueStages = new Set(filteredSessions.map((s) => s.stageId)).size;
    const matin = filteredSessions.filter((s) => s.creneau === "matin").length;
    const apm = filteredSessions.filter((s) => s.creneau === "apres_midi").length;
    const playersByStage = new Map<string, number>();
    const coachsByStage = new Map<string, number>();
    for (const s of filteredSessions) {
      if (!playersByStage.has(s.stageId)) playersByStage.set(s.stageId, s.nombre_joueurs);
      if (!coachsByStage.has(s.stageId)) coachsByStage.set(s.stageId, s.nombre_coachs);
    }
    const totalPlayers = [...playersByStage.values()].reduce((a, b) => a + b, 0);
    const totalCoachs = [...coachsByStage.values()].reduce((a, b) => a + b, 0);
    return { total: filteredSessions.length, uniqueStages, matin, apm, totalPlayers, totalCoachs };
  }, [filteredSessions]);

  return (
    <>
      <V2PageHeader
        title="Planning des séances"
        description={
          loading ?
            "Chargement des stages…"
          : "Créneaux alignés sur les terrains stage : matin 09-13, après-midi 14-18, journée 09-18"
        }
        actions={
          <V2PageActions
            onExportPdf={() =>
              exportPlanningPDF(
                filteredSessions.map((r) => ({
                  date: r.date,
                  heure_debut: r.heure_debut,
                  heure_fin: r.heure_fin,
                  jour: format(parseISO(`${r.date}T12:00:00`), "EEEE", { locale: fr }),
                  creneau: formatPlanningSlotLabel(r.creneau),
                  horaire: `${r.heure_debut} - ${r.heure_fin}`,
                  stage: r.stageName,
                  categorie: normalizeStageCategory(r.categorie),
                  statut: r.statut,
                  nombre_joueurs: r.nombre_joueurs,
                  nombre_coachs: r.nombre_coachs,
                  hebergement: yesNo(r.hebergement),
                  restauration: yesNo(r.restauration),
                  terrains: yesNo(r.terrains),
                  terrains_supplementaires: yesNo(r.terrains_supplementaires),
                  lettre_envoyee: yesNo(r.lettre_envoyee),
                  licences_verifiees: yesNo(r.licences_verifiees),
                  observations: r.observations,
                })),
                {
                  weekLabel,
                  generatedBy: user?.fullName ?? user?.email ?? "Utilisateur FRMT",
                  summary: {
                    totalSeances: weekSummary.total,
                    stagesActifs: weekSummary.uniqueStages,
                    totalJoueurs: weekSummary.totalPlayers,
                    totalCoachs: weekSummary.totalCoachs,
                    creneauxMatin: weekSummary.matin,
                    creneauxApresMidi: weekSummary.apm,
                  },
                }
              )
            }
          />
        }
      />
      <main className="space-y-4 p-4 sm:p-6">
        <Card className="border border-emerald-500/30 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.18),transparent_55%),var(--bg-card)] p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs uppercase tracking-wider text-emerald-300">Auto depuis stages</p>
              <p className="text-sm text-muted">{weekLabel}</p>
            </div>
            <span className="rounded-full border border-emerald-400/40 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-200">
              Auto depuis stages
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
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
            <div className="ml-auto flex gap-2">
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
          </div>
        </Card>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <Card className="border border-border/60 p-4 transition hover:border-emerald-500/50">
            <div className="mb-1 flex items-center gap-2 text-emerald-300"><CalendarDays className="h-4 w-4" /> Séances semaine</div>
            <p className="text-2xl font-bold">{weekSummary.total}</p>
            <p className="text-xs text-muted">Séances générées automatiquement</p>
          </Card>
          <Card className="border border-border/60 p-4 transition hover:border-emerald-500/50">
            <div className="mb-1 flex items-center gap-2 text-emerald-300"><Activity className="h-4 w-4" /> Stages actifs</div>
            <p className="text-2xl font-bold">{weekSummary.uniqueStages}</p>
            <p className="text-xs text-muted">Stages prévus/confirmés/en cours</p>
          </Card>
          <Card className="border border-border/60 p-4 transition hover:border-emerald-500/50">
            <div className="mb-1 flex items-center gap-2 text-emerald-300"><Sun className="h-4 w-4" /> Créneaux matin</div>
            <p className="text-2xl font-bold">{weekSummary.matin}</p>
            <p className="text-xs text-muted">Créneaux 09:00-13:00</p>
          </Card>
          <Card className="border border-border/60 p-4 transition hover:border-emerald-500/50">
            <div className="mb-1 flex items-center gap-2 text-emerald-300"><Clock3 className="h-4 w-4" /> Créneaux après-midi</div>
            <p className="text-2xl font-bold">{weekSummary.apm}</p>
            <p className="text-xs text-muted">Créneaux 14:00-18:00</p>
          </Card>
          <Card className="border border-border/60 p-4 transition hover:border-emerald-500/50">
            <div className="mb-1 flex items-center gap-2 text-emerald-300"><Users className="h-4 w-4" /> Total joueurs concernés</div>
            <p className="text-2xl font-bold">{weekSummary.totalPlayers}</p>
            <p className="text-xs text-muted">Cumul des stages visibles</p>
          </Card>
          <Card className="border border-border/60 p-4 transition hover:border-emerald-500/50">
            <div className="mb-1 flex items-center gap-2 text-emerald-300"><UserSquare2 className="h-4 w-4" /> Total coachs concernés</div>
            <p className="text-2xl font-bold">{weekSummary.totalCoachs}</p>
            <p className="text-xs text-muted">Encadrement technique planifié</p>
          </Card>
        </div>

        {filteredSessions.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="Aucune séance générée pour cette semaine"
            description="Configurez les terrains sur la fiche stage (onglet Terrains), puis synchronisez le planning depuis la fiche stage."
            actionLabel="Voir les stages"
            onAction={() => router.push("/v2/stages")}
          />
        ) : (
          <Card className="overflow-x-auto p-4">
            <h3 className="mb-3 text-xs uppercase tracking-wider text-[var(--text-muted)]">Vue semaine</h3>
            <div className="grid min-w-[1100px] grid-cols-7 gap-3">
              {weekDays.map((day) => {
                const dayIso = format(day, "yyyy-MM-dd");
                return (
                  <div key={dayIso} className="rounded border border-border/60 bg-[var(--bg-main)] p-2">
                    <p className="mb-2 text-xs font-semibold uppercase text-muted">
                      {format(day, "EEEE dd/MM", { locale: fr })}
                    </p>
                    {(["matin", "apres_midi", "journee"] as PlanningCreneauSlot[]).map((slot) => {
                      const key = `${dayIso}|${slot}`;
                      const slotSessions = sessionsByDaySlot.get(key) ?? [];
                      return (
                        <div key={key} className="mb-2 space-y-2 rounded border border-border/40 p-2">
                          <p className="flex items-center gap-1 text-[11px] font-semibold text-emerald-300">
                            {slot === "matin" ?
                              <Sun className="h-3 w-3" />
                            : slot === "apres_midi" ?
                              <Clock3 className="h-3 w-3" />
                            : <CalendarDays className="h-3 w-3" />}
                            {formatPlanningSlotLabel(slot)}
                          </p>
                          {slotSessions.length === 0 ? (
                            <p className="text-[11px] text-muted">Aucune séance</p>
                          ) : (
                            slotSessions.map((s) => (
                              <div
                                key={s.id}
                                className="rounded border border-emerald-500/30 bg-[linear-gradient(145deg,rgba(16,185,129,0.12),rgba(12,18,25,0.85))] p-2"
                              >
                                <div className="mb-1 flex items-start justify-between gap-1">
                                  <p className="text-xs font-semibold">{s.stageName}</p>
                                  <StatusBadge statut={s.statut} className="text-[10px]" />
                                </div>
                                <div className="mb-1 flex flex-wrap items-center gap-1 text-[10px]">
                                  <span className="rounded bg-emerald-500/20 px-1.5 py-0.5">{normalizeStageCategory(s.categorie)}</span>
                                  <span>{s.heure_debut}-{s.heure_fin}</span>
                                </div>
                                <p className="text-[10px] text-muted">
                                  {s.nombre_joueurs} joueurs · {s.nombre_coachs} coachs
                                </p>
                                <div className="mt-1 flex gap-2 text-[10px]">
                                  <Link href={`/v2/stages/${s.stageId}`} className="text-[#3498db] hover:underline">
                                    Fiche stage
                                  </Link>
                                  <Link href={`/v2/calendrier?stage=${s.stageId}`} className="text-frmt-green hover:underline">
                                    Calendrier
                                  </Link>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
            <div className="mt-4 rounded border border-border/40 bg-[var(--bg-main)] p-3 text-xs text-muted">
              <p className="mb-1 flex items-center gap-1 font-semibold text-emerald-300">
                <BadgeCheck className="h-3 w-3" /> Indicateurs conformité
              </p>
              <p>
                Hébergement: {filteredSessions.filter((s) => s.hebergement).length} · Restauration: {filteredSessions.filter((s) => s.restauration).length} · Terrains: {filteredSessions.filter((s) => s.terrains).length} · Licences vérifiées: {filteredSessions.filter((s) => s.licences_verifiees).length}
              </p>
            </div>
          </Card>
        )}
      </main>
    </>
  );
}
