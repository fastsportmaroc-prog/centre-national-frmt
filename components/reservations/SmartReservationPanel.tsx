"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Label } from "@/components/ui/Input";
import type { Court, Reservation } from "@/lib/types/database";
import {
  DEFAULT_DURATION_MIN,
  getNextAvailableSlot,
  suggestReservations,
} from "@/lib/reservations/smart";
import { formatDate } from "@/lib/utils/dates";
import { Sparkles } from "lucide-react";

type Props = {
  courts: Court[];
  reservations: Reservation[];
  onSelect: (courtId: string, start: Date, end: Date) => void;
};

export function SmartReservationPanel({ courts, reservations, onSelect }: Props) {
  const [day, setDay] = useState(() => new Date().toISOString().split("T")[0]);
  const [duration, setDuration] = useState(DEFAULT_DURATION_MIN);

  const suggestions = useMemo(() => {
    const d = new Date(day + "T12:00:00");
    return suggestReservations(d, courts, reservations, duration);
  }, [day, duration, courts, reservations]);

  const nextSlot = useMemo(
    () => getNextAvailableSlot(courts, reservations, new Date(), duration),
    [courts, reservations, duration]
  );

  return (
    <Card className="border-tennis/20 bg-tennis/5">
      <div className="mb-4 flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-tennis" />
        <h3 className="font-semibold">Réservation intelligente</h3>
      </div>
      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="smart-day">Date souhaitée</Label>
          <Input
            id="smart-day"
            type="date"
            value={day}
            onChange={(e) => setDay(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="smart-duration">Durée (minutes)</Label>
          <Input
            id="smart-duration"
            type="number"
            min={30}
            step={30}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
          />
        </div>
      </div>
      {nextSlot && (
        <div className="mb-4 rounded-lg border border-border bg-surface p-3">
          <p className="text-xs text-muted">Prochain créneau libre</p>
          <p className="font-medium">
            {nextSlot.court.nom} — {nextSlot.slot.label}
          </p>
          <Button
            size="sm"
            className="mt-2"
            onClick={() =>
              onSelect(nextSlot.court.id, nextSlot.slot.start, nextSlot.slot.end)
            }
          >
            Réserver ce créneau
          </Button>
        </div>
      )}
      <p className="mb-2 text-sm text-muted">
        Suggestions pour le {formatDate(day + "T12:00:00")} :
      </p>
      <div className="flex flex-wrap gap-2">
        {suggestions.length === 0 ? (
          <p className="text-sm text-muted">Aucun créneau disponible ce jour-là.</p>
        ) : (
          suggestions.map((s) => (
            <Button
              key={`${s.court.id}-${s.slot.start.toISOString()}`}
              variant="secondary"
              size="sm"
              onClick={() => onSelect(s.court.id, s.slot.start, s.slot.end)}
            >
              {s.court.nom} · {s.slot.label}
            </Button>
          ))
        )}
      </div>
    </Card>
  );
}
