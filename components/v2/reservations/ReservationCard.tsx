"use client";

import { Pencil, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import type { ReservationEnrichedV2 } from "@/lib/types/v2";
import {
  formatDateHeader,
  getCreneauInfoForReservation,
  infraLine,
} from "@/lib/v2/reservations-utils";
import { cn } from "@/lib/utils/cn";

function stageLine(r: ReservationEnrichedV2): string {
  return r.stage_nom ? `📋 ${r.stage_nom}` : "📋 —";
}

export function ReservationCard({
  r,
  conflict,
  conflictLabel,
  onEdit,
  onDelete,
}: {
  r: ReservationEnrichedV2;
  conflict: boolean;
  conflictLabel: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const c = getCreneauInfoForReservation(r);

  return (
    <Card
      className={cn(
        "relative p-4",
        conflict && "border-red-500 ring-1 ring-red-500/50"
      )}
    >
      {conflict && (
        <div className="mb-2 flex items-center gap-2 rounded-md border border-[#7b1a1a] bg-[#2d0d0d] px-3 py-1.5 text-[11px] font-medium text-[#fc8181]">
          <span aria-hidden>⚠</span>
          {conflictLabel || "Conflit terrain / programme"}
        </div>
      )}
      <p className="text-sm font-medium capitalize">📅 {formatDateHeader(r.date_debut)}</p>
      <hr className="my-2 border-border/60" />
      <p className="text-sm">{infraLine(r)}</p>
      <p className="mt-1 text-sm">
        {c.emoji} {c.label} &nbsp; {c.heureDebut} → {c.heureFin}
      </p>
      <p className="mt-1 text-sm text-muted">{stageLine(r)}</p>
      <div className="absolute bottom-2 right-2 flex gap-1 opacity-70 hover:opacity-100">
        <button
          type="button"
          onClick={onEdit}
          className="rounded p-1 text-muted hover:bg-surface-elevated hover:text-foreground"
          aria-label="Modifier"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="rounded p-1 text-muted hover:bg-red-500/10 hover:text-red-500"
          aria-label="Supprimer"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </Card>
  );
}
