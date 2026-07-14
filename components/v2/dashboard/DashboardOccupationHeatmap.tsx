"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { eachDayOfInterval, format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils/cn";
import type { OccupationSlot } from "@/app/api/dashboard/occupation/route";
import type { DashboardPeriod } from "@/lib/v2/dashboard-period";
import type { EntraineurV2, JoueurV2 } from "@/lib/types/v2";
import { DashboardPersonSearch } from "./DashboardPersonSearch";

type Props = {
  period: DashboardPeriod;
  slots: OccupationSlot[];
  joueurs: JoueurV2[];
  coaches: EntraineurV2[];
};

const CRENEAU_LABEL: Record<string, string> = {
  matin: "Matin",
  apres_midi: "Après-midi",
  journee: "Journée",
};

const MAX_DAYS = 31;

export function DashboardOccupationHeatmap({ period, slots, joueurs, coaches }: Props) {
  const [roleFilter, setRoleFilter] = useState<"all" | "joueur" | "coach">("all");
  const [personFilter, setPersonFilter] = useState<string | null>(null);

  const filteredSlots = useMemo(() => {
    return slots.filter((slot) => {
      if (roleFilter !== "all" && !slot.persons.some((p) => p.role === roleFilter)) return false;
      if (personFilter) {
        const [role, id] = personFilter.split(":");
        if (!slot.persons.some((p) => p.role === role && p.id === id)) return false;
      }
      return true;
    });
  }, [slots, roleFilter, personFilter]);

  const courts = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of filteredSlots) map.set(s.infrastructure_id, s.infrastructure_nom);
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [filteredSlots]);

  const days = useMemo(() => {
    const start = parseISO(`${period.start}T00:00:00`);
    const end = parseISO(`${period.end}T00:00:00`);
    const all = eachDayOfInterval({ start, end });
    return all.slice(0, MAX_DAYS);
  }, [period]);

  const slotIndex = useMemo(() => {
    const idx = new Map<string, OccupationSlot[]>();
    for (const s of filteredSlots) {
      const key = `${s.infrastructure_id}|${s.date}`;
      const arr = idx.get(key) ?? [];
      arr.push(s);
      idx.set(key, arr);
    }
    return idx;
  }, [filteredSlots]);

  function cellState(courtId: string, iso: string): { filled: boolean; label: string } {
    const daySlots = slotIndex.get(`${courtId}|${iso}`) ?? [];
    if (!daySlots.length) return { filled: false, label: "" };
    const creneaux = [...new Set(daySlots.map((s) => CRENEAU_LABEL[s.creneau] ?? s.creneau))];
    const stages = [...new Set(daySlots.map((s) => s.stage_nom).filter((n) => n && n !== "—"))];
    return {
      filled: true,
      label: `${creneaux.join(", ")}${stages.length ? " — " + stages.join(", ") : ""}`,
    };
  }

  return (
    <div className="v2-kpi-card p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="dashboard-section-label">Occupation des terrains</h2>
        <Link
          href="/v2/reservations"
          className="text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          Voir les réservations →
        </Link>
      </div>

      <div className="mb-3">
        <DashboardPersonSearch
          joueurs={joueurs}
          coaches={coaches}
          selectedKey={personFilter}
          onSelect={setPersonFilter}
          roleFilter={roleFilter}
          onRoleFilterChange={setRoleFilter}
        />
      </div>

      {courts.length === 0 ? (
        <p className="py-6 text-center text-[12px] text-[var(--text-muted)]">
          Aucune occupation de terrain sur la période / le filtre sélectionné.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-[var(--bg-card)] px-2 py-1.5 text-left font-medium text-[var(--text-muted)]">
                  Terrain
                </th>
                {days.map((d) => (
                  <th
                    key={format(d, "yyyy-MM-dd")}
                    className="px-1 py-1.5 text-center font-normal text-[var(--text-muted)]"
                  >
                    <div className="capitalize">{format(d, "EEEEE", { locale: fr })}</div>
                    <div>{format(d, "dd")}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {courts.map(([courtId, courtNom]) => (
                <tr key={courtId}>
                  <td className="sticky left-0 z-10 max-w-[130px] truncate bg-[var(--bg-card)] px-2 py-1 text-[var(--text-primary)]">
                    {courtNom}
                  </td>
                  {days.map((d) => {
                    const iso = format(d, "yyyy-MM-dd");
                    const { filled, label } = cellState(courtId, iso);
                    return (
                      <td key={iso} className="px-0.5 py-0.5 text-center">
                        <div
                          title={label || undefined}
                          className={cn(
                            "mx-auto h-5 w-5 rounded",
                            filled
                              ? "bg-[var(--frmt-green,#16a34a)]"
                              : "bg-[var(--bg-inset)]"
                          )}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
