"use client";

import { useCallback, useState } from "react";
import { GripVertical, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { BudgetLigneCategoryField } from "@/components/budget/BudgetLigneCategoryField";
import { BudgetLigneSaisieCells } from "@/components/budget/BudgetLigneSaisieCells";
import { defaultBudgetLigneValues } from "@/lib/constants/budget-ligne-saisie";
import type { BudgetPrevisionnelLine } from "@/lib/types/budget-previsionnel";
import {
  computeLignesWithTotals,
  formatEur,
  formatMad,
} from "@/lib/utils/budget-previsionnel-math";
import { cn } from "@/lib/utils/cn";

type LigneRow = Omit<BudgetPrevisionnelLine, "total_eur">;

type Props = {
  lignes: LigneRow[];
  devise: "EUR" | "MAD";
  prixLabel: string;
  totalParticipants: number;
  dateDebut: string;
  dateFin: string;
  onChange: (next: LigneRow[]) => void;
  onUpdateLigne: (idx: number, patch: Partial<BudgetPrevisionnelLine>) => void;
};

function reorderLignes(items: LigneRow[], fromIndex: number, toIndex: number): LigneRow[] {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= items.length) {
    return items;
  }
  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved!);
  return next.map((l, i) => ({ ...l, ordre: i }));
}

export function BudgetPrevisionnelLignesTable({
  lignes,
  devise,
  prixLabel,
  totalParticipants,
  dateDebut,
  dateFin,
  onChange,
  onUpdateLigne,
}: Props) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const finishDrag = useCallback(() => {
    setDragIndex(null);
    setOverIndex(null);
  }, []);

  const handleDrop = useCallback(
    (targetIndex: number) => {
      if (dragIndex === null) return;
      onChange(reorderLignes(lignes, dragIndex, targetIndex));
      finishDrag();
    },
    [dragIndex, finishDrag, lignes, onChange]
  );

  return (
    <div className="overflow-x-auto">
      <p className="mb-2 text-[10px] text-muted">
        Glissez la poignée pour déplacer une ligne vers le haut ou le bas.
      </p>
      <table className="w-full min-w-[760px] text-xs">
        <thead>
          <tr className="border-b border-border text-left text-muted">
            <th className="w-8 p-2" aria-label="Ordre" />
            <th className="p-2">Catégorie</th>
            <th className="p-2">Description</th>
            <th className="p-2">Détail de calcul</th>
            <th className="p-2 text-right">Total</th>
            <th className="w-10 p-2" />
          </tr>
        </thead>
        <tbody>
          {lignes.map((l, idx) => {
            const total = computeLignesWithTotals([l])[0]?.total_eur ?? 0;
            const isDragging = dragIndex === idx;
            const isOver = overIndex === idx && dragIndex !== null && dragIndex !== idx;

            return (
              <tr
                key={l.id}
                className={cn(
                  "border-b border-border/50 align-top transition-colors",
                  isDragging && "opacity-40",
                  isOver && "bg-[var(--tennis)]/10 ring-1 ring-inset ring-[var(--tennis)]/30"
                )}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  setOverIndex(idx);
                }}
                onDragLeave={() => {
                  if (overIndex === idx) setOverIndex(null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  handleDrop(idx);
                }}
              >
                <td className="p-1 align-middle">
                  <button
                    type="button"
                    draggable
                    title="Déplacer la ligne"
                    aria-label={`Déplacer la ligne ${idx + 1}`}
                    className={cn(
                      "flex h-8 w-8 cursor-grab items-center justify-center rounded text-muted",
                      "hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] active:cursor-grabbing"
                    )}
                    onDragStart={(e) => {
                      setDragIndex(idx);
                      e.dataTransfer.effectAllowed = "move";
                      e.dataTransfer.setData("text/plain", String(idx));
                    }}
                    onDragEnd={finishDrag}
                  >
                    <GripVertical className="h-4 w-4" />
                  </button>
                </td>
                <td className="p-1">
                  <BudgetLigneCategoryField
                    value={l.designation}
                    onChange={(designation) => {
                      const defaults = defaultBudgetLigneValues(designation, {
                        nombrePersonnes: totalParticipants,
                        dateDebut,
                        dateFin,
                      });
                      onUpdateLigne(idx, {
                        designation,
                        quantite: defaults.quantite,
                        jours_nuits: defaults.jours_nuits,
                      });
                    }}
                  />
                </td>
                <td className="p-1">
                  <Input
                    value={l.description ?? ""}
                    onChange={(e) =>
                      onUpdateLigne(idx, { description: e.target.value || null })
                    }
                  />
                </td>
                <td className="p-1">
                  <BudgetLigneSaisieCells
                    line={l}
                    onChange={(patch) => onUpdateLigne(idx, patch)}
                  />
                </td>
                <td className="p-2 text-right font-medium whitespace-nowrap">
                  <span className="text-[10px] text-muted">{prixLabel}</span>
                  <br />
                  {devise === "EUR" ? formatEur(total) : formatMad(total)}
                </td>
                <td className="p-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      onChange(
                        lignes
                          .filter((_, i) => i !== idx)
                          .map((row, i) => ({ ...row, ordre: i }))
                      )
                    }
                    disabled={lignes.length <= 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
