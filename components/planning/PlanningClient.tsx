"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { getCourts } from "@/lib/data/courts";
import { getReservationsWithRelations } from "@/lib/data/reservations";
import { getInfrastructures } from "@/lib/data/infrastructures";
import { getReservationsInfrastructureWithRelations } from "@/lib/data/reservation-infra";
import type { Court, ReservationWithRelations } from "@/lib/types/database";
import type { ReservationInfrastructureWithRelations } from "@/lib/types/reservation-infra";
import { formatDate, formatTime, getWeekDays } from "@/lib/utils/dates";
import { addWeeks, subWeeks } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";

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

  const load = useCallback(async () => {
    const [c, r, i, ri] = await Promise.all([
      getCourts(),
      getReservationsWithRelations(),
      getInfrastructures(),
      getReservationsInfrastructureWithRelations(),
    ]);
    setCourts(c.filter((x) => x.actif));
    setReservations(r.filter((x) => x.statut !== "annulee"));
    setInfras(
      i
        .filter((x) => x.actif && x.type !== "terrain")
        .map((x) => ({ id: x.id, nom: x.nom }))
    );
    setReservationsInfra(ri.filter((x) => x.statut !== "annulee"));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const days = getWeekDays(weekRef);

  function reservationsFor(courtId: string, day: Date) {
    return reservations.filter((r) => {
      const d = new Date(r.date_debut);
      return (
        r.court_id === courtId &&
        d.getFullYear() === day.getFullYear() &&
        d.getMonth() === day.getMonth() &&
        d.getDate() === day.getDate()
      );
    });
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

  return (
    <>
      <PageHeader
        title="Planning"
        description="Vue hebdomadaire — courts et infrastructures (fitness, natation, espace)"
      />
      <main className="flex-1 space-y-4 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={vue === "courts" ? "primary" : "secondary"}
              onClick={() => setVue("courts")}
            >
              Courts
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
                      const list = reservationsFor(court.id, day);
                      return (
                        <td key={day.toISOString()} className="px-2 py-2">
                          <div className="space-y-1">
                            {list.map((r) => (
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
      </main>
    </>
  );
}
