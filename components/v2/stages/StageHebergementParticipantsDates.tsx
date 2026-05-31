"use client";

import { CalendarRange } from "lucide-react";
import { Input, Label } from "@/components/ui/Input";
import { mergeParticipantDatesForStage } from "@/lib/hebergement/participants-dates";
import type {
  EntraineurV2,
  HebergementParticipantDates,
  JoueurV2,
  StageHebergementForm,
} from "@/lib/types/v2";

type Props = {
  form: StageHebergementForm;
  joueurs: Pick<JoueurV2, "id" | "nom" | "prenom">[];
  coachs: Pick<EntraineurV2, "id" | "nom" | "prenom">[];
  disabled?: boolean;
  onChange: (participants_dates: HebergementParticipantDates[]) => void;
};

function personLabel(nom: string, prenom: string) {
  return `${nom.toUpperCase()} ${prenom}`;
}

export function StageHebergementParticipantsDates({
  form,
  joueurs,
  coachs,
  disabled,
  onChange,
}: Props) {
  const rows = mergeParticipantDatesForStage(
    joueurs,
    coachs,
    form.date_debut,
    form.date_fin,
    form.participants_dates
  );

  function updateRow(
    personne_id: string,
    personne_type: "joueur" | "entraineur",
    patch: Partial<HebergementParticipantDates>
  ) {
    const next = rows.map((r) =>
      r.personne_id === personne_id && r.personne_type === personne_type ? { ...r, ...patch } : r
    );
    onChange(next);
  }

  function applyStageDatesToAll() {
    onChange(
      rows.map((r) => ({
        ...r,
        date_debut: form.date_debut,
        date_fin: form.date_fin,
        dates_personnalisees: false,
      }))
    );
  }

  if (joueurs.length === 0 && coachs.length === 0) {
    return (
      <p className="text-sm text-[var(--text-muted)]">
        Affectez des joueurs et du staff dans l&apos;onglet Participants pour définir les dates
        d&apos;hébergement.
      </p>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)]/30 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase text-[var(--text-muted)]">
          <CalendarRange className="h-3.5 w-3.5" />
          Dates hébergement par participant
        </p>
        {!disabled && (
          <button
            type="button"
            className="text-xs text-frmt-green underline-offset-2 hover:underline"
            onClick={applyStageDatesToAll}
          >
            Réinitialiser aux dates du stage
          </button>
        )}
      </div>
      <p className="text-xs text-[var(--text-muted)]">
        Cochez « dates spécifiques » sur chaque ligne pour une arrivée tardive ou un départ anticipé.
      </p>

      <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
        {rows.map((r) => {
          const label =
            r.personne_type === "joueur"
              ? joueurs.find((j) => j.id === r.personne_id)
              : coachs.find((c) => c.id === r.personne_id);
          if (!label) return null;
          const name = personLabel(label.nom, label.prenom);
          return (
            <div
              key={`${r.personne_type}-${r.personne_id}`}
              className={`grid gap-2 rounded border p-2 sm:grid-cols-[1fr_auto_auto_auto] ${
                r.dates_personnalisees
                  ? "border-frmt-green/40 bg-frmt-green/5"
                  : "border-[var(--border)]/60"
              }`}
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-[var(--text-primary)]">{name}</p>
                <p className="text-[10px] uppercase text-[var(--text-muted)]">
                  {r.personne_type === "joueur" ? "Joueur" : "Staff"}
                </p>
              </div>
              <label className="flex items-center gap-1.5 text-xs sm:col-span-3">
                <input
                  type="checkbox"
                  disabled={disabled}
                  checked={r.dates_personnalisees}
                  onChange={(e) =>
                    updateRow(r.personne_id, r.personne_type, {
                      dates_personnalisees: e.target.checked,
                      date_debut: r.date_debut || form.date_debut,
                      date_fin: r.date_fin || form.date_fin,
                    })
                  }
                />
                Dates spécifiques
              </label>
              <div>
                <Label className="text-[10px]">Arrivée</Label>
                <Input
                  type="date"
                  disabled={disabled || !r.dates_personnalisees}
                  value={r.date_debut}
                  onChange={(e) =>
                    updateRow(r.personne_id, r.personne_type, {
                      date_debut: e.target.value,
                      dates_personnalisees: true,
                    })
                  }
                />
              </div>
              <div>
                <Label className="text-[10px]">Départ</Label>
                <Input
                  type="date"
                  disabled={disabled || !r.dates_personnalisees}
                  value={r.date_fin}
                  onChange={(e) =>
                    updateRow(r.personne_id, r.personne_type, {
                      date_fin: e.target.value,
                      dates_personnalisees: true,
                    })
                  }
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
