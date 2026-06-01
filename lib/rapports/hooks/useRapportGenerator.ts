"use client";

import { useCallback, useState } from "react";
import type { RapportType, ReportSectionsConfig } from "@/lib/rapports/types";
import { DEFAULT_SECTIONS_CONFIG } from "@/lib/rapports/types";
import {
  saveReportLocal,
  type StoredReportV2,
} from "@/lib/v2/reports-storage";
import { MOCK_COMPETITION_ID, MOCK_STAGE_U18_ID } from "@/lib/rapports/mock-data";
import { resolveReportPeriode } from "@/lib/rapports/periode-utils";

export type GeneratorStep = 1 | 2 | 3 | 4;

export type GeneratorState = {
  step: GeneratorStep;
  type: RapportType;
  entityId: string;
  entityLabel: string;
  periodeDebut: string;
  periodeFin: string;
  sections: ReportSectionsConfig;
  recommandations: string;
};

const INITIAL: GeneratorState = {
  step: 1,
  type: "bilan_stage",
  entityId: "",
  entityLabel: "",
  periodeDebut: "",
  periodeFin: "",
  sections: { ...DEFAULT_SECTIONS_CONFIG },
  recommandations: "",
};

export function useRapportGenerator(onCreated?: (report: StoredReportV2) => void) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<GeneratorState>(INITIAL);

  const reset = useCallback(() => {
    setState(INITIAL);
  }, []);

  const openModal = useCallback(() => {
    reset();
    setOpen(true);
  }, [reset]);

  const closeModal = useCallback(() => {
    setOpen(false);
    reset();
  }, [reset]);

  function patch(partial: Partial<GeneratorState>) {
    setState((s) => ({ ...s, ...partial }));
  }

  function nextStep() {
    setState((s) => ({ ...s, step: Math.min(4, s.step + 1) as GeneratorStep }));
  }

  function prevStep() {
    setState((s) => ({ ...s, step: Math.max(1, s.step - 1) as GeneratorStep }));
  }

  function toggleSection(key: keyof ReportSectionsConfig) {
    setState((s) => ({
      ...s,
      sections: { ...s.sections, [key]: !s.sections[key] },
    }));
  }

  function buildTitre(): string {
    const { type, entityLabel, periodeDebut, periodeFin } = state;
    if (entityLabel) {
      if (type === "bilan_stage") return `Bilan — ${entityLabel}`;
      if (type === "competition") return `Rapport — ${entityLabel}`;
    }
    if (type === "hebdomadaire") return `Rapport hebdomadaire — ${periodeDebut || "semaine"}`;
    if (type === "mensuel") {
      const d = periodeDebut ? new Date(periodeDebut) : new Date();
      return `Rapport mensuel — ${d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}`;
    }
    if (type === "annuel") {
      const y = periodeDebut ? new Date(periodeDebut).getFullYear() : new Date().getFullYear();
      return `Rapport annuel — ${y}`;
    }
    return "Nouveau rapport";
  }

  function generate(): StoredReportV2 {
    const id = crypto.randomUUID();
    const entityId =
      state.entityId ||
      (state.type === "bilan_stage" ? MOCK_STAGE_U18_ID : state.type === "competition" ? MOCK_COMPETITION_ID : undefined);

    const periode =
      state.type === "hebdomadaire" || state.type === "mensuel" || state.type === "annuel"
        ? resolveReportPeriode(state.type, state.periodeDebut, state.periodeFin)
        : state.periodeDebut && state.periodeFin
          ? { debut: state.periodeDebut, fin: state.periodeFin }
          : undefined;

    const report: StoredReportV2 = {
      id,
      titre: buildTitre(),
      type: state.type,
      entity_id: entityId,
      stage_id: state.type === "bilan_stage" ? entityId : undefined,
      stage_nom: state.type === "bilan_stage" ? state.entityLabel : undefined,
      competition_nom: state.type === "competition" ? state.entityLabel : undefined,
      periode,
      statut: "genere",
      sections: state.sections,
      recommandations: state.recommandations || undefined,
      generated_at: new Date().toISOString(),
      generated_by: "s.abderrazzaq@frmt.ma",
    };

    saveReportLocal(report);
    const created = report;
    closeModal();
    onCreated?.(created);
    return created;
  }

  return {
    open,
    state,
    openModal,
    closeModal,
    patch,
    nextStep,
    prevStep,
    toggleSection,
    generate,
    setState,
  };
}
