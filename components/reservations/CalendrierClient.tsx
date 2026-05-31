"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { ReservationCalendar } from "@/components/reservations/ReservationCalendar";
import { Card } from "@/components/ui/Card";
import { getReservationsWithRelations } from "@/lib/data/reservations";
import { getReservationsInfrastructureWithRelations } from "@/lib/data/reservation-infra";
import type { ReservationWithRelations } from "@/lib/types/database";
import type { ReservationInfrastructureWithRelations } from "@/lib/types/reservation-infra";
import {
  calendrierTypeClass,
  getCalendrierEvenementsStage,
  type CalendrierEvenement,
} from "@/lib/data/calendrier-stage";
import { formatDate, formatTime } from "@/lib/utils/dates";
import { LocalTestBadge } from "@/components/ui/LocalTestBadge";
import { isLocalTestModeClient } from "@/lib/local-test/mode";
import { Trophy } from "lucide-react";

export function CalendrierClient() {
  const [reservations, setReservations] = useState<ReservationWithRelations[]>([]);
  const [stageReservations, setStageReservations] = useState<
    ReservationInfrastructureWithRelations[]
  >([]);
  const [stageEvents, setStageEvents] = useState<CalendrierEvenement[]>([]);
  const [localMode, setLocalMode] = useState(false);

  const load = useCallback(async () => {
    setLocalMode(isLocalTestModeClient());
    const [r, ri, ev] = await Promise.all([
      getReservationsWithRelations(),
      getReservationsInfrastructureWithRelations(),
      getCalendrierEvenementsStage(),
    ]);
    setReservations(r);
    setStageReservations(ri.filter((x) => x.stage_id && x.statut !== "annulee"));
    setStageEvents(ev);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <>
      <PageHeader
        title="Calendrier"
        description="Réservations courts et créneaux stages provisionnés"
      />
      <main className="flex-1 space-y-6 p-4 sm:p-6">
        {localMode && <LocalTestBadge />}
        <ReservationCalendar reservations={reservations} />

        {stageEvents.length > 0 ? (
          <Card className="border-frmt-green/20 p-4">
            <p className="mb-3 text-sm font-semibold text-frmt-green">
              Événements stages (couleurs)
            </p>
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 text-sm">
              {stageEvents.slice(0, 36).map((ev) => (
                <li
                  key={ev.id}
                  className={`rounded-md border px-3 py-2 ${calendrierTypeClass(ev.type)}`}
                >
                  {ev.href ? (
                    <Link href={ev.href} className="font-medium hover:underline">
                      {ev.titre}
                    </Link>
                  ) : (
                    <span className="font-medium">{ev.titre}</span>
                  )}
                  <p className="text-xs opacity-80">
                    {formatDate(ev.date_debut)}
                    {ev.date_fin !== ev.date_debut ? ` → ${formatDate(ev.date_fin)}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          </Card>
        ) : null}

        {stageReservations.length > 0 ? (
          <Card className="border-frmt-green/20 p-4">
            <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-frmt-green">
              <Trophy className="h-4 w-4" />
              Créneaux terrains liés aux stages ({stageReservations.length})
            </p>
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 text-sm">
              {stageReservations.slice(0, 24).map((r) => (
                <li key={r.id} className="rounded-md border border-border px-3 py-2">
                  <Link
                    href={r.stage_id ? `/stages/${r.stage_id}` : "#"}
                    className="font-medium text-frmt-green hover:underline"
                  >
                    {r.stage_libelle ?? "Stage"}
                  </Link>
                  <p className="text-muted text-xs">
                    {r.infrastructure_nom ?? "Terrain"} · {formatDate(r.date_debut)}{" "}
                    {formatTime(r.date_debut)}–{formatTime(r.date_fin)}
                  </p>
                </li>
              ))}
            </ul>
            {stageReservations.length > 24 && (
              <p className="mt-2 text-xs text-muted">
                + {stageReservations.length - 24} autres créneaux — voir Planning
              </p>
            )}
          </Card>
        ) : (
          <Card className="border-dashed p-4 text-sm text-muted">
            Aucun créneau terrain provisionné par un stage. Les créneaux apparaissent ici après
            création d&apos;un stage avec terrains activés.
          </Card>
        )}
      </main>
    </>
  );
}
