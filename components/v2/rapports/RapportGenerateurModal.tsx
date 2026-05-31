"use client";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input, Select } from "@/components/ui/Input";
import { getStages } from "@/lib/supabase/queries";
import { MOCK_COMPETITION_ID, MOCK_STAGE_U18_ID } from "@/lib/rapports/mock-data";
import type { useRapportGenerator } from "@/lib/rapports/hooks/useRapportGenerator";
import {
  SECTION_LABELS,
  type RapportType,
  type ReportSectionKey,
} from "@/lib/rapports/types";
import { useEffect, useState } from "react";

type GeneratorApi = ReturnType<typeof useRapportGenerator>;

type Props = {
  generator: GeneratorApi;
  onGenerated: (reportId: string) => void;
};

const TYPE_OPTIONS: { value: RapportType; label: string }[] = [
  { value: "bilan_stage", label: "Bilan de stage" },
  { value: "competition", label: "Bilan compétition" },
  { value: "hebdomadaire", label: "Hebdomadaire" },
  { value: "mensuel", label: "Mensuel" },
  { value: "annuel", label: "Annuel" },
];

export function RapportGenerateurModal({ generator, onGenerated }: Props) {
  const { open, state, closeModal, patch, nextStep, prevStep, toggleSection, generate } = generator;
  const [stages, setStages] = useState<{ id: string; label: string }[]>([]);

  useEffect(() => {
    if (!open) return;
    void getStages().then((s) =>
      setStages(s.map((x) => ({ id: x.id, label: x.stage_action })))
    );
  }, [open]);

  function handleGenerate() {
    const report = generate();
    onGenerated(report.id);
  }

  const needsEntity = state.type === "bilan_stage" || state.type === "competition";
  const sectionKeys = Object.keys(SECTION_LABELS) as ReportSectionKey[];

  return (
    <Modal open={open} onClose={closeModal} title="Nouveau rapport" panelClassName="max-w-lg">
      <p className="text-xs text-muted">Étape {state.step} / 4</p>

      {state.step === 1 && (
        <div className="mt-3 space-y-3">
          <p className="text-sm font-medium">Type de rapport</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {TYPE_OPTIONS.map((t) => (
              <button
                key={t.value}
                type="button"
                className={`rounded-lg border p-3 text-left text-sm ${
                  state.type === t.value
                    ? "border-frmt-green bg-frmt-green/10"
                    : "border-[#2a2d3a]"
                }`}
                onClick={() => patch({ type: t.value, entityId: "", entityLabel: "" })}
              >
                {t.label}
              </button>
            ))}
          </div>
          <Button onClick={nextStep}>Suivant</Button>
        </div>
      )}

      {state.step === 2 && (
        <div className="mt-3 space-y-3">
          {needsEntity ? (
            <>
              <p className="text-sm font-medium">Stage ou compétition</p>
              <Select
                value={state.entityId}
                onChange={(e) => {
                  const id = e.target.value;
                  const label =
                    id === MOCK_STAGE_U18_ID
                      ? "Stage National U18 — Mai 2026"
                      : id === MOCK_COMPETITION_ID
                        ? "Open de Casablanca U18"
                        : stages.find((s) => s.id === id)?.label ?? "";
                  patch({ entityId: id, entityLabel: label });
                }}
              >
                <option value="">— Sélectionner —</option>
                {state.type === "bilan_stage" && (
                  <option value={MOCK_STAGE_U18_ID}>🧪 Stage National U18 — Mai 2026 (démo)</option>
                )}
                {state.type === "competition" && (
                  <option value={MOCK_COMPETITION_ID}>🧪 Open Casablanca U18 (démo)</option>
                )}
                {stages.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </>
          ) : (
            <>
              <p className="text-sm font-medium">Période couverte</p>
              <p className="text-xs text-muted">
                {state.type === "mensuel"
                  ? "Indiquez une date du mois (début et fin calculés automatiquement)."
                  : state.type === "annuel"
                    ? "Indiquez une date de l'année (janvier → décembre)."
                    : "Indiquez le lundi de la semaine (lundi → dimanche)."}
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                <Input
                  type="date"
                  value={state.periodeDebut}
                  onChange={(e) => patch({ periodeDebut: e.target.value })}
                  aria-label="Date de début"
                />
                {state.type !== "mensuel" && state.type !== "annuel" && state.type !== "hebdomadaire" && (
                  <Input
                    type="date"
                    value={state.periodeFin}
                    onChange={(e) => patch({ periodeFin: e.target.value })}
                    aria-label="Date de fin"
                  />
                )}
              </div>
            </>
          )}
          <div className="flex gap-2">
            <Button variant="secondary" onClick={prevStep}>
              Retour
            </Button>
            <Button
              onClick={nextStep}
              disabled={needsEntity && !state.entityId}
            >
              Suivant
            </Button>
          </div>
        </div>
      )}

      {state.step === 3 && (
        <div className="mt-3 space-y-3">
          <p className="text-sm font-medium">Sections à inclure</p>
          <div className="max-h-52 space-y-2 overflow-y-auto">
            {sectionKeys.map((key) => (
              <label key={key} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={state.sections[key] !== false}
                  onChange={() => toggleSection(key)}
                />
                {SECTION_LABELS[key]}
              </label>
            ))}
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={prevStep}>
              Retour
            </Button>
            <Button onClick={nextStep}>Aperçu</Button>
          </div>
        </div>
      )}

      {state.step === 4 && (
        <div className="mt-3 space-y-3">
          <div className="rounded-lg border border-frmt-gold/30 bg-[#0f1117] p-4 text-sm">
            <p className="text-xs uppercase text-muted">Aperçu</p>
            <p className="mt-2 font-semibold">
              {state.entityLabel || TYPE_OPTIONS.find((t) => t.value === state.type)?.label}
            </p>
            <p className="mt-1 text-xs text-muted">
              {Object.values(state.sections).filter(Boolean).length} sections activées
            </p>
          </div>
          <Input
            placeholder="Observations (optionnel)"
            value={state.observations}
            onChange={(e) => patch({ observations: e.target.value })}
          />
          <Input
            placeholder="Recommandations (optionnel)"
            value={state.recommandations}
            onChange={(e) => patch({ recommandations: e.target.value })}
          />
          <div className="flex gap-2">
            <Button variant="secondary" onClick={prevStep}>
              Retour
            </Button>
            <Button onClick={handleGenerate}>Générer le rapport</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
