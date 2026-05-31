"use client";

import { NumericInput } from "@/components/ui/NumericInput";
import {
  budgetLigneFormuleText,
  getBudgetLigneSaisieLabels,
  getBudgetLigneSaisieMode,
  type BudgetLigneSaisieMode,
} from "@/lib/constants/budget-ligne-saisie";

type LineSlice = {
  designation: string;
  quantite: number;
  jours_nuits: number;
  prix_unitaire_eur: number;
};

type Props = {
  line: LineSlice;
  onChange: (patch: Partial<LineSlice>) => void;
  mode?: BudgetLigneSaisieMode;
};

export function BudgetLigneSaisieCells({ line, onChange, mode: modeProp }: Props) {
  const mode = modeProp ?? getBudgetLigneSaisieMode(line.designation);
  const labels = getBudgetLigneSaisieLabels(mode);
  const showCol2 = mode !== "personnes_prix" && mode !== "quantite_prix";
  const formule = budgetLigneFormuleText(line, mode);

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="min-w-[72px]">
        <span className="mb-0.5 block text-[10px] text-muted">{labels.col1}</span>
        <NumericInput
          allowEmpty
          min={0}
          value={line.quantite}
          onChange={(quantite) => onChange({ quantite })}
          className="text-xs"
        />
      </div>
      {showCol2 ? (
        <div className="min-w-[72px]">
          <span className="mb-0.5 block text-[10px] text-muted">{labels.col2}</span>
          <NumericInput
            allowEmpty
            min={1}
            value={line.jours_nuits}
            onChange={(jours_nuits) => onChange({ jours_nuits: Math.max(1, jours_nuits) })}
            className="text-xs"
          />
        </div>
      ) : (
        <div className="hidden min-w-[72px] sm:block" aria-hidden />
      )}
      <div className="min-w-[88px]">
        <span className="mb-0.5 block text-[10px] text-muted">{labels.prix}</span>
        <NumericInput
          allowEmpty
          min={0}
          value={line.prix_unitaire_eur}
          onChange={(prix_unitaire_eur) => onChange({ prix_unitaire_eur })}
          className="text-xs"
        />
      </div>
      {formule && (
        <span className="pb-2 text-[10px] text-muted" title={labels.hint}>
          {formule}
        </span>
      )}
    </div>
  );
}
