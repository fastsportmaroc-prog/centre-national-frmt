"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { ReservationCalendar } from "@/components/reservations/ReservationCalendar";
import { getReservationsWithRelations } from "@/lib/data/reservations";
import type { ReservationWithRelations } from "@/lib/types/database";

export function CalendrierClient() {
  const [reservations, setReservations] = useState<ReservationWithRelations[]>([]);

  const load = useCallback(async () => {
    setReservations(await getReservationsWithRelations());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <>
      <PageHeader
        title="Calendrier"
        description="Vue mensuelle des réservations de courts"
      />
      <main className="flex-1 p-4 sm:p-6">
        <ReservationCalendar reservations={reservations} />
      </main>
    </>
  );
}
