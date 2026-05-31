"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { getCourts } from "@/lib/data/courts";
import { getReservationsWithRelations } from "@/lib/data/reservations";
import { getInfrastructures } from "@/lib/data/infrastructures";
import {
  deleteReservationInfrastructure,
  getReservationsInfrastructureWithRelations,
} from "@/lib/data/reservation-infra";
import { deletePlanningEntry, getPlanningEntries } from "@/lib/data/stage-services";
import { getStageProvisionSummaries } from "@/lib/data/stage-besoins";
import { exportPdfReport } from "@/lib/export/reports";
import { buildFrmtReportMeta } from "@/lib/pdf/frmt-pdf";
import type { PlanningRecord } from "@/lib/types/stage-services";
import type { StageProvisionSummary } from "@/lib/data/stage-besoins";
import type { Court, ReservationWithRelations } from "@/lib/types/database";
import type { ReservationInfrastructureWithRelations } from "@/lib/types/reservation-infra";
import { isTerrainInfrastructure } from "@/lib/utils/infrastructure-court";
import { formatDate, formatTime, getWeekDays } from "@/lib/utils/dates";
import { addWeeks, subWeeks } from "date-fns";
import { ChevronLeft, ChevronRight, FileDown, Trash2, Trophy } from "lucide-react";

type VuePlanning = "courts" | "infrastructures";

export function PlanningClient() {
  const [vue, setVue] = useState<VuePlanning>("courts");
  const [weekRef, setWeekRef] = useState(new Date());
  const [courts, setCourts] = useState<Court[]>([]);
  const [reservations, setReservations] = useState<ReservationWithRelations[]>([]);
  const [infras, setInfras] = useState<{ id: string; nom: string }[]>([]);
  const [reservationsInfra, setReservationsInfra] = useState<
    ReservationInfrastructureWithRelations[]
  >([]);
  const [stageProvisions, setStageProvisions] = useState<StageProvisionSummary[]>([]);
  const [planningRows, setPlanningRows] = useState<PlanningRecord[]>([]);

  const load = useCallback(async () => {
    const [c, r, i, ri, provisions, planning] = await Promise.all([
      getCourts(),
      getReservationsWithRelations(),
      getInfrastructures(),
      getReservationsInfrastructureWithRelations(),
      getStageProvisionSummaries(),
      getPlanningEntries(),
    ]);
    setCourts(c.filter((x) => x.actif));
    setReservations(r.filter((x) => x.statut !== "annulee"));
    setInfras(
      i
        .filter((x) => x.actif && !isTerrainInfrastructure(x))
        .map((x) => ({ id: x.id, nom: x.nom }))
    );
    setReservationsInfra(ri.filter((x) => x.statut !== "annulee"));
    setStageProvisions(provisions.filter((p) => p.reservations.length > 0));
    setPlanningRows(planning);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const days = getWeekDays(weekRef);

  function reservationsFor(courtId: string, day: Date) {
    const joueurRes = reservations.filter((r) => {
      const d = new Date(r.date_debut);
      return (
        r.court_id === courtId &&
        d.getFullYear() === day.getFullYear() &&
        d.getMonth() === day.getMonth() &&
        d.getDate() === day.getDate()
      );
    });
    const stageRes = reservationsInfra.filter((r) => {
      const d = new Date(r.date_debut);
      return (
        r.infrastructure_id === courtId &&
        r.stage_id &&
        d.getFullYear() === day.getFullYear() &&
        d.getMonth() === day.getMonth() &&
        d.getDate() === day.getDate()
      );
    });
    return { joueurRes, stageRes };
  }

  function reservationsInfraFor(infraId: string, day: Date) {
    return reservationsInfra.filter((r) => {
      const d = new Date(r.date_debut);
      return (
        r.infrastructure_id === infraId &&
        d.getFullYear() === day.getFullYear() &&
        d.getMonth() === day.getMonth() &&
        d.getDate() === day.getDate()
      );
    });
  }

  async function exportPlanningPdf() {
    const meta = buildFrmtReportMeta(
      "Planning hebdomadaire",
      ["Date", "Heure début", "Heure fin", "Stage", "Infrastructure", "Statut"],
      planningRows.map((p) => [
        formatDate(p.date),
        p.heure_debut,
        p.heure_fin,
        p.stage_id.slice(0, 8),
        p.infrastructure_id.slice(0, 8),
        p.statut,
      ])
    );
    await exportPdfReport("planning.pdf", meta);
  }

  async function handleDeletePlanning(id: string) {
    if (!confirm("Supprimer ce créneau planning ?")) return;
    await deletePlanningEntry(id);
    await load();
  }

  async function handleDeleteReservation(id: string) {
    if (!confirm("Supprimer cette réservation infrastructure ?")) return;
    await deleteReservationInfrastructure(id);
    await load();
  }

  return (
    <>
      <PageHeader
        title="Planning"
        description="Vue hebdomadaire — courts, terrains stages et infrastructures"
        actions={
          <Button size="sm" variant="secondary" onClick={exportPlanningPdf}>
            <FileDown className="h-4 w-4" />
            Export PDF
          </Button>
        }
      />
      <main className="flex-1 space-y-4 p-4 sm:p-6">
        {stageProvisions.length > 0 && (
          <Card className="border-frmt-green/20 p-4">
            <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-frmt-green">
              <Trophy className="h-4 w-4" />
              Séances stages provisionnées
            </p>
            <ul className="space-y-1 text-sm">
              {stageProvisions.map(({ stage, reservations: res }) => (
                <li key={stage.id} className="flex flex-wrap items-center gap-2">
                  <Link href={`/stages/${stage.id}`} className="font-medium hover:underline">
                    {stage.stage_action}
                  </Link>
                  <span className="text-muted">
                    {formatDate(stage.date_debut)} · {res.length} créneau(x)
                  </span>
                  <Badge variant="muted">{stage.statut}</Badge>
                </li>
              ))}
            </ul>
          </Card>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={vue === "courts" ? "primary" : "secondary"}
              onClick={() => setVue("courts")}
            >
              Courts / terrains
            </Button>
            <Button
              size="sm"
              variant={vue === "infrastructures" ? "primary" : "secondary"}
              onClick={() => setVue("infrastructures")}
            >
              Infrastructures
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => setWeekRef(subWeeks(weekRef, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium">
              Semaine du {formatDate(days[0].toISOString())}
            </span>
            <Button variant="secondary" size="sm" onClick={() => setWeekRef(addWeeks(weekRef, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {vue === "courts" ? (
          <Card className="overflow-x-auto p-0">
            <table className="w-full min-w-[800px] text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-elevated">
                  <th className="px-3 py-2 text-left font-medium text-muted">Court</th>
                  {days.map((d) => (
                    <th key={d.toISOString()} className="px-3 py-2 text-left font-medium">
                      {formatDate(d.toISOString(), "EEE dd/MM")}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {courts.map((court) => (
                  <tr key={court.id} className="border-b border-border/60 align-top">
                    <td className="px-3 py-3 font-medium">{court.nom}</td>
                    {days.map((day) => {
                      const { joueurRes, stageRes } = reservationsFor(court.id, day);
                      return (
                        <td key={day.toISOString()} className="px-2 py-2">
                          <div className="space-y-1">
                            {stageRes.map((r) => (
                              <div
                                key={r.id}
                                className="rounded-md border border-frmt-green/40 bg-frmt-green/10 px-2 py-1 text-xs"
                              >
                                <p className="font-medium text-frmt-green">
                                  {r.stage_libelle ?? "Stage"}
                                </p>
                                <p className="text-muted">
                                  {formatTime(r.date_debut)}–{formatTime(r.date_fin)}
                                </p>
                              </div>
                            ))}
                            {joueurRes.map((r) => (
                              <div
                                key={r.id}
                                className="rounded-md border border-tennis/30 bg-tennis/10 px-2 py-1 text-xs"
                              >
                                <p className="font-medium text-tennis">
                                  {r.joueur?.prenom} {r.joueur?.nom}
                                </p>
                                <p className="text-muted">
                                  {formatTime(r.date_debut)}–{formatTime(r.date_fin)}
                                </p>
                              </div>
                            ))}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        ) : (
          <Card className="overflow-x-auto p-0">
            {infras.length === 0 ? (
              <p className="p-4 text-sm text-muted">Aucune infrastructure hors terrains.</p>
            ) : (
              <table className="w-full min-w-[800px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface-elevated">
                    <th className="px-3 py-2 text-left font-medium text-muted">Infrastructure</th>
                    {days.map((d) => (
                      <th key={d.toISOString()} className="px-3 py-2 text-left font-medium">
                        {formatDate(d.toISOString(), "EEE dd/MM")}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {infras.map((infra) => (
                    <tr key={infra.id} className="border-b border-border/60 align-top">
                      <td className="px-3 py-3 font-medium">{infra.nom}</td>
                      {days.map((day) => {
                        const list = reservationsInfraFor(infra.id, day);
                        return (
                          <td key={day.toISOString()} className="px-2 py-2">
                            <div className="space-y-1">
                              {list.map((r) => (
                                <div
                                  key={r.id}
                                  className="rounded-md border border-frmt-green/30 bg-frmt-green/10 px-2 py-1 text-xs"
                                >
                                  <p className="font-medium text-frmt-green">
                                    {r.stage_libelle ?? r.joueur_nom ?? "Réservation"}
                                  </p>
                                  <p className="text-muted">
                                    {formatTime(r.date_debut)}–{formatTime(r.date_fin)}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        )}

        {planningRows.length > 0 && (
          <Card className="p-4">
            <p className="mb-2 text-sm font-semibold">Créneaux planning (table)</p>
            <ul className="space-y-1 text-sm">
              {planningRows.slice(0, 20).map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-2">
                  <span>
                    {formatDate(p.date)} {p.heure_debut}–{p.heure_fin} · stage {p.stage_id.slice(0, 8)}
                  </span>
                  <Button size="sm" variant="secondary" onClick={() => handleDeletePlanning(p.id)}>
                    <Trash2 className="h-3 w-3 text-red-400" />
                    Supprimer
                  </Button>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {reservationsInfra.length > 0 && (
          <Card className="p-4">
            <p className="mb-2 text-sm font-semibold">Réservations infrastructure</p>
            <ul className="space-y-1 text-sm">
              {reservationsInfra.slice(0, 15).map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-2">
                  <span>
                    {r.infrastructure_nom ?? r.infrastructure_id} · {formatDate(r.date_debut)}{" "}
                    {formatTime(r.date_debut)}–{formatTime(r.date_fin)}
                  </span>
                  <Button size="sm" variant="secondary" onClick={() => handleDeleteReservation(r.id)}>
                    <Trash2 className="h-3 w-3 text-red-400" />
                    Supprimer
                  </Button>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </main>
    </>
  );
}
