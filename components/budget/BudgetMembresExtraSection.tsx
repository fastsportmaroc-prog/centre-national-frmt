"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Input";
import {
  BUDGET_MEMBRE_EXTRA_TYPES,
  budgetMembreExtraBadgeLabel,
} from "@/lib/constants/budget-membres";
import type { BudgetMembreExtra, BudgetMembreExtraType } from "@/lib/types/budget-previsionnel";
import { HeartPulse, Landmark, UserPlus, X } from "lucide-react";

type Props = {
  membres: BudgetMembreExtra[];
  onChange: (membres: BudgetMembreExtra[]) => void;
  title?: string;
  description?: string;
  allowedTypes?: BudgetMembreExtraType[];
};

function newId() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `membre-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function BudgetMembresExtraSection({
  membres,
  onChange,
  title = "Autres membres",
  description = "Choisissez le type (fonction) — le nom est optionnel. Ajoutez pour compter un membre même sans nom.",
  allowedTypes,
}: Props) {
  const typeOptions = useMemo(() => {
    if (!allowedTypes?.length) return BUDGET_MEMBRE_EXTRA_TYPES;
    return BUDGET_MEMBRE_EXTRA_TYPES.filter((t) => allowedTypes.includes(t.value));
  }, [allowedTypes]);

  const [type, setType] = useState<BudgetMembreExtraType>(
    typeOptions[0]?.value ?? "kine"
  );
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");

  useEffect(() => {
    if (!typeOptions.some((t) => t.value === type)) {
      setType(typeOptions[0]?.value ?? "kine");
    }
  }, [typeOptions, type]);

  const visibleMembres = useMemo(() => {
    if (!allowedTypes?.length) return membres;
    return membres.filter((m) => allowedTypes.includes(m.type));
  }, [membres, allowedTypes]);

  function addMembre() {
    const n = nom.trim();
    const p = prenom.trim();
    onChange([
      ...membres,
      {
        id: newId(),
        type,
        ...(n ? { nom: n } : {}),
        ...(p ? { prenom: p } : {}),
      },
    ]);
    setPrenom("");
    setNom("");
  }

  function removeMembre(id: string) {
    onChange(membres.filter((m) => m.id !== id));
  }

  const TypeIcon =
    type === "kine" ? HeartPulse : type === "federal" ? Landmark : UserPlus;

  return (
    <div className="space-y-3 rounded-lg border border-dashed border-sky-500/40 bg-sky-500/5 p-3">
      <div>
        <p className="text-sm font-medium text-[var(--fg)]">{title}</p>
        {description && <p className="mt-0.5 text-xs text-muted">{description}</p>}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Label>Fonction</Label>
          <Select
            value={type}
            onChange={(e) => setType(e.target.value as BudgetMembreExtraType)}
            className="mt-1"
          >
            {typeOptions.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Prénom</Label>
          <Input
            value={prenom}
            onChange={(e) => setPrenom(e.target.value)}
            className="mt-1"
            placeholder="Optionnel"
          />
        </div>
        <div>
          <Label>Nom</Label>
          <Input
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            className="mt-1"
            placeholder="Optionnel"
          />
        </div>
        <div className="flex items-end">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="w-full gap-1"
            onClick={addMembre}
          >
            <TypeIcon className="h-4 w-4" />
            Ajouter
          </Button>
        </div>
      </div>

      {visibleMembres.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {visibleMembres.map((m) => (
            <li
              key={m.id}
              className="inline-flex items-center gap-1 rounded-full bg-sky-500/15 px-2.5 py-1 text-xs ring-1 ring-sky-500/30"
            >
              <span>{budgetMembreExtraBadgeLabel(m)}</span>
              <button
                type="button"
                onClick={() => removeMembre(m.id)}
                className="ml-0.5 rounded p-0.5 hover:bg-sky-500/20"
                aria-label="Retirer"
              >
                <X className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
