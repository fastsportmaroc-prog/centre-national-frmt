"use client";

import { useMemo, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { fr } from "date-fns/locale";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils/cn";
import type { ReservationWithRelations } from "@/lib/types/database";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Props = {
  reservations: ReservationWithRelations[];
  onDayClick?: (date: Date) => void;
};

export function ReservationCalendar({ reservations, onDayClick }: Props) {
  const [current, setCurrent] = useState(new Date());

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(current), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(current), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [current]);

  function countForDay(day: Date) {
    return reservations.filter(
      (r) =>
        r.statut !== "annulee" && isSameDay(new Date(r.date_debut), day)
    ).length;
  }

  function reservationsForDay(day: Date) {
    return reservations.filter(
      (r) =>
        r.statut !== "annulee" && isSameDay(new Date(r.date_debut), day)
    );
  }

  const [selected, setSelected] = useState<Date | null>(null);
  const selectedList = selected ? reservationsForDay(selected) : [];

  return (
    <Card className="p-0 overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <Button variant="ghost" size="sm" onClick={() => setCurrent(subMonths(current, 1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="font-semibold capitalize">
          {format(current, "MMMM yyyy", { locale: fr })}
        </span>
        <Button variant="ghost" size="sm" onClick={() => setCurrent(addMonths(current, 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <div className="grid grid-cols-7 border-b border-border bg-surface-elevated text-center text-xs text-muted">
        {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d) => (
          <div key={d} className="py-2 font-medium">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const count = countForDay(day);
          const inMonth = isSameMonth(day, current);
          const isSelected = selected && isSameDay(day, selected);
          const isToday = isSameDay(day, new Date());
          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => {
                setSelected(day);
                onDayClick?.(day);
              }}
              className={cn(
                "min-h-[72px] border-b border-r border-border/50 p-1 text-left transition-colors hover:bg-surface-elevated",
                !inMonth && "opacity-40",
                isSelected && "bg-tennis/10 ring-1 ring-inset ring-tennis/40"
              )}
            >
              <span
                className={cn(
                  "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs",
                  isToday && "bg-tennis font-bold text-zinc-950"
                )}
              >
                {format(day, "d")}
              </span>
              {count > 0 && (
                <span className="mt-1 block truncate rounded bg-tennis/20 px-1 text-[10px] text-tennis">
                  {count} rés.
                </span>
              )}
            </button>
          );
        })}
      </div>
      {selected && (
        <div className="border-t border-border p-4">
          <p className="mb-2 text-sm font-medium">
            {format(selected, "EEEE d MMMM", { locale: fr })}
          </p>
          {selectedList.length === 0 ? (
            <p className="text-sm text-muted">Aucune réservation.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {selectedList.map((r) => (
                <li key={r.id} className="rounded-lg border border-border px-3 py-2">
                  <span className="font-medium">
                    {r.joueur?.prenom} {r.joueur?.nom}
                  </span>
                  <span className="text-muted"> — {r.court?.nom}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Card>
  );
}
