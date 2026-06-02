"use client";

import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import type { TerrainOccupancySlot } from "@/lib/actions/terrain-occupancy-actions";
import type { CreneauType } from "@/lib/v2/reservations-utils";
import { cn } from "@/lib/utils/cn";

const CRENEAU_ROWS: { key: CreneauType; label: string }[] = [
  { key: "matin", label: "Matin" },
  { key: "apres_midi", label: "Après-midi" },
  { key: "journee", label: "Journée" },
];

type Props = {
  days: string[];
  infrastructureId: string;
  infrastructureNom?: string;
  occupancy: TerrainOccupancySlot[];
  selectedCreneau?: CreneauType;
};

function slotKey(date: string, infraId: string, creneau: CreneauType): string {
  return `${date}|${infraId}|${creneau}`;
}

function overlapsCreneau(requested: CreneauType, occupied: CreneauType): boolean {
  if (requested === "journee" || occupied === "journee") return true;
  return requested === occupied;
}

export function StageTerrainOccupancyGrid({
  days,
  infrastructureId,
  infrastructureNom,
  occupancy,
  selectedCreneau,
}: Props) {
  const byKey = new Map<string, TerrainOccupancySlot[]>();
  for (const o of occupancy) {
    if (o.infrastructure_id !== infrastructureId) continue;
    for (const row of CRENEAU_ROWS) {
      if (!overlapsCreneau(row.key, o.creneau)) continue;
      const k = slotKey(o.date, o.infrastructure_id, row.key);
      const list = byKey.get(k) ?? [];
      list.push(o);
      byKey.set(k, list);
    }
  }

  if (!infrastructureId || days.length === 0) {
    return (
      <p className="text-xs text-muted">
        Sélectionnez un terrain et des jours pour voir les créneaux déjà pris par d&apos;autres stages.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted">
        Disponibilité — {infrastructureNom ?? "terrain"} (autres stages)
      </p>
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full min-w-[420px] text-xs">
          <thead>
            <tr className="border-b border-border bg-surface-elevated/50">
              <th className="p-2 text-left font-medium">Jour</th>
              {CRENEAU_ROWS.map((c) => (
                <th key={c.key} className="p-2 text-center font-medium">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {days.map((day) => (
              <tr key={day} className="border-t border-border/60">
                <td className="whitespace-nowrap p-2 font-medium capitalize">
                  {format(parseISO(`${day}T12:00:00`), "EEE d MMM", { locale: fr })}
                </td>
                {CRENEAU_ROWS.map((c) => {
                  const occupants = byKey.get(slotKey(day, infrastructureId, c.key)) ?? [];
                  const busy = occupants.length > 0;
                  const isSelected = selectedCreneau === c.key;
                  return (
                    <td
                      key={c.key}
                      className={cn(
                        "p-2 text-center align-top",
                        isSelected && "ring-1 ring-inset ring-frmt-green/50",
                        busy ? "bg-red-500/10" : "bg-emerald-500/5"
                      )}
                    >
                      {busy ? (
                        <div className="space-y-0.5">
                          {occupants.slice(0, 2).map((o) => (
                            <span
                              key={o.reservation_id}
                              className="block truncate text-[10px] font-medium text-red-400"
                              title={o.stage_nom}
                            >
                              {o.stage_nom}
                            </span>
                          ))}
                          {occupants.length > 2 && (
                            <span className="text-[10px] text-muted">+{occupants.length - 2}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[10px] text-emerald-600">Libre</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[10px] text-muted">
        Rouge = autre stage sur ce créneau. Les réservations de ce stage apparaissent dans le tableau
        ci-dessous et dans la rubrique Réservations après validation.
      </p>
    </div>
  );
}
